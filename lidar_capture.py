#!/usr/bin/env python3
"""
Ouster LiDAR Traffic Capture & Analysis Tool

Captures real Ouster OS-1 LiDAR packets from a network interface
and outputs TSN-relevant traffic profile statistics.

Usage:
  sudo python3 lidar_capture.py --iface enp11s0 --duration 10
  sudo python3 lidar_capture.py --pcap capture.pcap
  python3 lidar_capture.py --demo   # Use built-in Ouster OS-1-16 specs

Ouster OS-1-16-A0 measured profile:
  - 416KB/frame (426,496 bytes)
  - 10Hz frame rate (100ms period)
  - 128 UDP packets per frame, 3,328 bytes each
  - Destination port: 7502 (lidar data), 7503 (IMU)
  - 3 IP fragments per packet at MTU 1500
  - ~34 Mbps aggregate data rate
"""

import argparse
import json
import sys
import time
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from pathlib import Path

OUSTER_LIDAR_PORT = 7502
OUSTER_IMU_PORT = 7503


@dataclass
class FrameStats:
    """Statistics for a single LiDAR frame."""
    timestamp: float = 0.0
    packet_count: int = 0
    total_bytes: int = 0
    min_pkt_size: int = 0
    max_pkt_size: int = 0
    fragment_count: int = 0
    duration_us: float = 0.0  # time from first to last packet in frame


@dataclass
class TrafficProfile:
    """Aggregate traffic profile for TSN analysis."""
    sensor_model: str = ""
    capture_duration_s: float = 0.0
    frame_count: int = 0
    frame_rate_hz: float = 0.0
    avg_frame_size_bytes: int = 0
    avg_pkts_per_frame: int = 0
    avg_pkt_size_bytes: int = 0
    data_rate_mbps: float = 0.0
    ip_fragments_per_pkt: int = 0
    total_frags_per_frame: int = 0
    # TSN analysis
    tx_time_per_pkt_us: float = 0.0  # at 1 Gbps
    tx_time_per_frame_us: float = 0.0
    burst_duration_us: float = 0.0
    feasibility: dict = field(default_factory=dict)


def analyze_pcap(pcap_path):
    """Analyze a pcap file for Ouster LiDAR traffic."""
    try:
        from scapy.all import rdpcap, UDP, IP
    except ImportError:
        print("Error: scapy is required. Install with:")
        print("  pip3 install --break-system-packages scapy")
        sys.exit(1)

    print(f"Reading {pcap_path}...")
    packets = rdpcap(str(pcap_path))

    lidar_pkts = []
    for pkt in packets:
        if pkt.haslayer(UDP) and pkt[UDP].dport == OUSTER_LIDAR_PORT:
            lidar_pkts.append({
                'time': float(pkt.time),
                'size': len(pkt[UDP].payload),
                'ip_len': pkt[IP].len if pkt.haslayer(IP) else 0,
                'mf': bool(pkt[IP].flags.MF) if pkt.haslayer(IP) else False,
                'frag_offset': pkt[IP].frag if pkt.haslayer(IP) else 0,
            })

    if not lidar_pkts:
        print("No Ouster LiDAR packets found (UDP port 7502)")
        return None

    return _build_profile(lidar_pkts, "Ouster (captured)")


def capture_live(iface, duration):
    """Capture live Ouster LiDAR traffic from a network interface."""
    try:
        from scapy.all import sniff, UDP, IP
    except ImportError:
        print("Error: scapy is required. Install with:")
        print("  pip3 install --break-system-packages scapy")
        sys.exit(1)

    print(f"Capturing on {iface} for {duration}s (filter: UDP port {OUSTER_LIDAR_PORT})...")
    print("Press Ctrl+C to stop early.\n")

    lidar_pkts = []

    def handle_pkt(pkt):
        if pkt.haslayer(UDP) and pkt[UDP].dport == OUSTER_LIDAR_PORT:
            lidar_pkts.append({
                'time': float(pkt.time),
                'size': len(pkt[UDP].payload),
                'ip_len': pkt[IP].len if pkt.haslayer(IP) else 0,
                'mf': bool(pkt[IP].flags.MF) if pkt.haslayer(IP) else False,
                'frag_offset': pkt[IP].frag if pkt.haslayer(IP) else 0,
            })

    try:
        sniff(
            iface=iface,
            filter=f"udp port {OUSTER_LIDAR_PORT}",
            prn=handle_pkt,
            timeout=duration,
            store=False,
        )
    except PermissionError:
        print("Error: Capturing requires root privileges.")
        print("  sudo python3 lidar_capture.py --iface", iface, "--duration", duration)
        sys.exit(1)

    if not lidar_pkts:
        print("No Ouster LiDAR packets captured.")
        return None

    return _build_profile(lidar_pkts, f"Ouster (captured on {iface})")


def _build_profile(lidar_pkts, sensor_model):
    """Build traffic profile from captured/parsed packets."""
    lidar_pkts.sort(key=lambda p: p['time'])

    # Group packets into frames (gap > 5ms = new frame)
    frames = []
    current_frame = []
    for pkt in lidar_pkts:
        if current_frame and (pkt['time'] - current_frame[-1]['time']) > 0.005:
            frames.append(current_frame)
            current_frame = []
        current_frame.append(pkt)
    if current_frame:
        frames.append(current_frame)

    # Compute per-frame stats
    frame_stats = []
    for frame_pkts in frames:
        sizes = [p['size'] for p in frame_pkts]
        frags = sum(1 for p in frame_pkts if p['mf'] or p['frag_offset'] > 0)
        fs = FrameStats(
            timestamp=frame_pkts[0]['time'],
            packet_count=len(frame_pkts),
            total_bytes=sum(sizes),
            min_pkt_size=min(sizes),
            max_pkt_size=max(sizes),
            fragment_count=frags,
            duration_us=(frame_pkts[-1]['time'] - frame_pkts[0]['time']) * 1e6,
        )
        frame_stats.append(fs)

    # Aggregate
    total_dur = lidar_pkts[-1]['time'] - lidar_pkts[0]['time']
    n_frames = len(frame_stats)
    avg_bytes = sum(f.total_bytes for f in frame_stats) // max(n_frames, 1)
    avg_pkts = sum(f.packet_count for f in frame_stats) // max(n_frames, 1)
    avg_pkt_size = avg_bytes // max(avg_pkts, 1)
    frame_rate = n_frames / max(total_dur, 0.001)
    data_rate = (avg_bytes * 8 * frame_rate) / 1e6

    # IP fragmentation estimate
    if avg_pkt_size > 1500:
        frags_per_pkt = (avg_pkt_size + 1499) // 1500
    else:
        frags_per_pkt = 1

    # TSN timing at 1 Gbps
    tx_per_pkt = (avg_pkt_size * 8) / 1000  # us at 1 Gbps
    tx_per_frame = (avg_bytes * 8) / 1000    # us at 1 Gbps

    # Feasibility check at common deadlines
    feasibility = {}
    for dl_ms in [1, 2, 5, 10, 20, 50, 100]:
        dl_us = dl_ms * 1000
        for hops in [2, 3]:
            key = f"{dl_ms}ms_{hops}hop"
            total_tx = tx_per_frame * hops
            feasibility[key] = {
                'deadline_us': dl_us,
                'hops': hops,
                'total_tx_us': round(total_tx, 1),
                'feasible': total_tx <= dl_us,
                'margin_us': round(dl_us - total_tx, 1),
            }

    profile = TrafficProfile(
        sensor_model=sensor_model,
        capture_duration_s=round(total_dur, 2),
        frame_count=n_frames,
        frame_rate_hz=round(frame_rate, 1),
        avg_frame_size_bytes=avg_bytes,
        avg_pkts_per_frame=avg_pkts,
        avg_pkt_size_bytes=avg_pkt_size,
        data_rate_mbps=round(data_rate, 1),
        ip_fragments_per_pkt=frags_per_pkt,
        total_frags_per_frame=frags_per_pkt * avg_pkts,
        tx_time_per_pkt_us=round(tx_per_pkt, 1),
        tx_time_per_frame_us=round(tx_per_frame, 1),
        burst_duration_us=round(sum(f.duration_us for f in frame_stats) / max(n_frames, 1), 1),
        feasibility=feasibility,
    )
    return profile


def demo_profile():
    """Return built-in Ouster OS-1-16-A0 traffic profile (no capture needed)."""
    frame_bytes = 426496  # 416KB measured
    pkts_per_frame = 128
    pkt_size = 3328
    frame_rate = 10.0
    data_rate = (frame_bytes * 8 * frame_rate) / 1e6
    tx_per_pkt = (pkt_size * 8) / 1000
    tx_per_frame = (frame_bytes * 8) / 1000
    frags_per_pkt = 3  # MTU 1500: 1500+1500+328

    feasibility = {}
    for dl_ms in [1, 2, 5, 10, 20, 50, 100]:
        dl_us = dl_ms * 1000
        for hops in [2, 3]:
            key = f"{dl_ms}ms_{hops}hop"
            total_tx = tx_per_frame * hops
            feasibility[key] = {
                'deadline_us': dl_us,
                'hops': hops,
                'total_tx_us': round(total_tx, 1),
                'feasible': total_tx <= dl_us,
                'margin_us': round(dl_us - total_tx, 1),
            }

    return TrafficProfile(
        sensor_model="Ouster OS-1-16-A0",
        capture_duration_s=0,
        frame_count=0,
        frame_rate_hz=frame_rate,
        avg_frame_size_bytes=frame_bytes,
        avg_pkts_per_frame=pkts_per_frame,
        avg_pkt_size_bytes=pkt_size,
        data_rate_mbps=round(data_rate, 1),
        ip_fragments_per_pkt=frags_per_pkt,
        total_frags_per_frame=frags_per_pkt * pkts_per_frame,
        tx_time_per_pkt_us=round(tx_per_pkt, 1),
        tx_time_per_frame_us=round(tx_per_frame, 1),
        burst_duration_us=0,
        feasibility=feasibility,
    )


def print_profile(profile):
    """Pretty-print a traffic profile."""
    print("\n" + "=" * 60)
    print(f"  LiDAR Traffic Profile: {profile.sensor_model}")
    print("=" * 60)
    if profile.capture_duration_s > 0:
        print(f"  Capture Duration:     {profile.capture_duration_s:.1f} s")
        print(f"  Frames Captured:      {profile.frame_count}")
    print(f"  Frame Rate:           {profile.frame_rate_hz} Hz")
    print(f"  Frame Size:           {profile.avg_frame_size_bytes:,} bytes ({profile.avg_frame_size_bytes/1024:.0f} KB)")
    print(f"  Packets / Frame:      {profile.avg_pkts_per_frame}")
    print(f"  Packet Size:          {profile.avg_pkt_size_bytes:,} bytes")
    print(f"  Data Rate:            {profile.data_rate_mbps} Mbps")
    print(f"  IP Fragments / Pkt:   {profile.ip_fragments_per_pkt}")
    print(f"  Total Frags / Frame:  {profile.total_frags_per_frame}")
    print()
    print("  TSN Analysis (1 Gbps links):")
    print(f"  Tx Time / Packet:     {profile.tx_time_per_pkt_us} \u00b5s")
    print(f"  Tx Time / Frame:      {profile.tx_time_per_frame_us} \u00b5s ({profile.tx_time_per_frame_us/1000:.1f} ms)")
    if profile.burst_duration_us > 0:
        print(f"  Burst Duration:       {profile.burst_duration_us} \u00b5s ({profile.burst_duration_us/1000:.1f} ms)")
    print()
    print("  Deadline Feasibility:")
    print(f"  {'Deadline':>10} {'Hops':>5} {'E2E Tx':>10} {'Margin':>10} {'Result':>8}")
    print("  " + "-" * 48)
    for key in sorted(profile.feasibility.keys()):
        f = profile.feasibility[key]
        result = "\u2705 OK" if f['feasible'] else "\u274c MISS"
        print(f"  {f['deadline_us']/1000:>8.0f}ms {f['hops']:>5}  {f['total_tx_us']/1000:>8.1f}ms {f['margin_us']/1000:>8.1f}ms {result:>8}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Capture and analyze Ouster LiDAR traffic for TSN scheduling"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--iface', help='Network interface to capture from (requires sudo)')
    group.add_argument('--pcap', help='PCAP file to analyze')
    group.add_argument('--demo', action='store_true', help='Use built-in OS-1-16 specs (no capture)')

    parser.add_argument('--duration', type=int, default=10, help='Capture duration in seconds (default: 10)')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--output', help='Save JSON output to file')

    args = parser.parse_args()

    if args.demo:
        profile = demo_profile()
    elif args.pcap:
        profile = analyze_pcap(args.pcap)
    else:
        profile = capture_live(args.iface, args.duration)

    if profile is None:
        sys.exit(1)

    if args.json or args.output:
        data = asdict(profile)
        if args.output:
            Path(args.output).write_text(json.dumps(data, indent=2))
            print(f"Saved to {args.output}")
        else:
            print(json.dumps(data, indent=2))
    else:
        print_profile(profile)


if __name__ == '__main__':
    main()
