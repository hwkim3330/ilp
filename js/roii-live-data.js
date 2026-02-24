/* ═══════════════════════════════════════════════
   roii-live-data.js — Ouster OS-1-16 Real LiDAR Traffic Model
   Measured: 416KB/frame, 10Hz, 128 pkts/frame, 3328B/pkt
   IP fragmentation: 3 fragments per packet (MTU 1500)
   ═══════════════════════════════════════════════ */

/* ── Nodes & Links (same topology as roii-real-data.js) ── */

export const LIVE_NODES = [
  { id: "LIDAR_FC", type: "endstation" },
  { id: "LIDAR_FL", type: "endstation" },
  { id: "LIDAR_FR", type: "endstation" },
  { id: "LIDAR_R",  type: "endstation" },
  { id: "RADAR_F",   type: "endstation" },
  { id: "RADAR_FLC", type: "endstation" },
  { id: "RADAR_FRC", type: "endstation" },
  { id: "RADAR_RLC", type: "endstation" },
  { id: "RADAR_RRC", type: "endstation" },
  { id: "SW_FL",   type: "switch" },
  { id: "SW_FR",   type: "switch" },
  { id: "SW_REAR", type: "switch" },
  { id: "ACU_IT",  type: "endstation" }
];

export const LIVE_LINKS = [
  { id: "l_lidarfc_swfl",   from: "LIDAR_FC",  to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_lidarfl_swfl",   from: "LIDAR_FL",  to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_lidarfr_swfr",   from: "LIDAR_FR",  to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_lidarr_swrear",  from: "LIDAR_R",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_radarf_swfl",    from: "RADAR_F",   to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_radarflc_swfl",  from: "RADAR_FLC", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_radarfrc_swfr",  from: "RADAR_FRC", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_radarrlc_swrear",from: "RADAR_RLC", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_radarrrc_swrear",from: "RADAR_RRC", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfl_swfr",    from: "SW_FL",   to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swfl",    from: "SW_FR",   to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfl_swrear",  from: "SW_FL",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfl",  from: "SW_REAR", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swrear",  from: "SW_FR",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfr",  from: "SW_REAR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_acu",   from: "SW_REAR", to: "ACU_IT",  rate_mbps: 1000, prop_delay_us: 0.3 }
];

/* ═══════════════════════════════════════════════
   STREAMING model: Ouster sends 128 UDP packets of 3328B each per frame
   Each packet is schedulable as an individual TSN frame (no IP fragmentation)
   Measured: 781µs uniform interval between packets (±90.6µs jitter)

   Ouster OS-1-16: 128 pkts/frame @ 10Hz = 128 pkts per 100ms
   Real period = 100000/128 = 781.25µs → use 781µs (floor)
   Greedy solver handles non-divisible periods via floor
   ═══════════════════════════════════════════════ */
export const ROII_LIVE_BURST = {
  cycle_time_us: 100000,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: JSON.parse(JSON.stringify(LIVE_NODES)),
  links: JSON.parse(JSON.stringify(LIVE_LINKS)),
  flows: [
    // Ouster OS-1-16 Front Center — 128 pkts/cycle, 3328B each, 10Hz
    { id: "f_lidar_fc", priority: 7, payload_bytes: 3328, period_us: 781, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 2 },
    // Ouster OS-1-16 Rear — same profile
    { id: "f_lidar_r",  priority: 7, payload_bytes: 3328, period_us: 781, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 2 },
    // Pandar 40P for FL/FR (32KB burst, 20Hz)
    { id: "f_lidar_fl", priority: 7, payload_bytes: 32768, period_us: 50000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 2 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 32768, period_us: 50000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 2 },
    // MRR-35 Radar x5 — 4KB x2 at 50Hz
    { id: "f_radar_f",   priority: 6, payload_bytes: 4096, period_us: 5000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_F",   dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_flc", priority: 6, payload_bytes: 4096, period_us: 5000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FLC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_frc", priority: 6, payload_bytes: 4096, period_us: 5000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FRC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_rlc", priority: 6, payload_bytes: 4096, period_us: 5000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RLC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_rrc", priority: 6, payload_bytes: 4096, period_us: 5000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RRC", dst: "ACU_IT", k_paths: 2 }
  ]
};

/* ═══════════════════════════════════════════════
   FRAGMENTED model: same Ouster data but IP fragmented (MTU 1500)
   Each 3328B UDP pkt → 3 IP fragments: 1480+1480+376 bytes
   128 pkts × 3 frags = 384 fragments per frame

   Real periods (non-divisible, Greedy handles via floor):
   Ouster: 384 frags/100ms → 100000/384 = 260.4µs → 260µs
   Pandar: 46 frags/100ms → 100000/46 = 2173.9µs → 2174µs
   Radar:  60 frags/100ms → 100000/60 = 1666.7µs → 1667µs
   ═══════════════════════════════════════════════ */
export const ROII_LIVE_FRAG = {
  cycle_time_us: 100000,
  guard_band_us: 1,
  processing_delay_us: 1,
  nodes: JSON.parse(JSON.stringify(LIVE_NODES)),
  links: JSON.parse(JSON.stringify(LIVE_LINKS)),
  flows: [
    // Ouster FC fragmented: 384 frags/cycle, 1480B each, 11.8µs tx
    { id: "f_lidar_fc", priority: 7, payload_bytes: 1480, period_us: 260, deadline_us: 2000,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 2 },
    // Ouster Rear fragmented
    { id: "f_lidar_r",  priority: 7, payload_bytes: 1480, period_us: 260, deadline_us: 2000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 2 },
    // Pandar FL/FR fragmented: ~46 frags/cycle
    { id: "f_lidar_fl", priority: 7, payload_bytes: 1480, period_us: 2174, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 2 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 1480, period_us: 2174, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 2 },
    // Radar fragmented: ~60 frags/cycle
    { id: "f_radar_f",   priority: 6, payload_bytes: 1480, period_us: 1667, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_F",   dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_flc", priority: 6, payload_bytes: 1480, period_us: 1667, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FLC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_frc", priority: 6, payload_bytes: 1480, period_us: 1667, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FRC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_rlc", priority: 6, payload_bytes: 1480, period_us: 1667, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RLC", dst: "ACU_IT", k_paths: 2 },
    { id: "f_radar_rrc", priority: 6, payload_bytes: 1480, period_us: 1667, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RRC", dst: "ACU_IT", k_paths: 2 }
  ]
};

/* ── Scenario Descriptions ── */
export const LIVE_BURST_SCENARIO = {
  title: "Ouster OS-1-16 Streaming \u2014 128 pkts/frame, 781\u00b5s interval",
  description: "Real measured traffic from Ouster OS-1-16-A0 LiDAR: <strong>416KB per frame</strong> (425,984B UDP payload) at 10Hz. Each frame: 128 UDP packets of 3,328 bytes, streamed at <strong>781\u00b5s uniform intervals</strong> (\u00b190.6\u00b5s jitter). Data rate: 34.1 Mbps (UDP) / 35.9 Mbps (wire). Per-packet Tx = 26.6\u00b5s at 1Gbps. Front-center and rear positions use Ouster; side positions keep Pandar 40P. Per-packet scheduling: <strong>3-hop E2E = 91\u00b5s</strong> \u2014 well within any practical deadline. IMU: 56B \u00d7 100Hz on port 7503.",
  flows: [
    { name: "Ouster FC \u2192 ACU-IT",    color: "#10B981", desc: "3328B \u00d7128 pkts, P7, 781\u00b5s period (26.6\u00b5s tx)" },
    { name: "Ouster Rear \u2192 ACU-IT",  color: "#10B981", desc: "3328B \u00d7128 pkts, P7, 781\u00b5s period (26.6\u00b5s tx)" },
    { name: "Pandar FL \u2192 ACU-IT",    color: "#0D9488", desc: "32KB burst, P7, 50ms period (262.4\u00b5s tx)" },
    { name: "Pandar FR \u2192 ACU-IT",    color: "#0D9488", desc: "32KB burst, P7, 50ms period (262.4\u00b5s tx)" },
    { name: "MRR-35 F \u2192 ACU-IT",    color: "#952aff", desc: "4KB \u00d72, P6, 5ms period (33.1\u00b5s tx)" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "4KB \u00d72, P6, 5ms period (33.1\u00b5s tx)" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "4KB \u00d72, P6, 5ms period (33.1\u00b5s tx)" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "4KB \u00d72, P6, 5ms period (33.1\u00b5s tx)" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "4KB \u00d72, P6, 5ms period (33.1\u00b5s tx)" }
  ],
  domains: [
    { name: "Ouster OS-1-16 (1Gbps)",       color: "#10B981" },
    { name: "Hesai Pandar 40P (1Gbps)",      color: "#0D9488" },
    { name: "Continental MRR-35 (1Gbps)",    color: "#952aff" },
    { name: "LAN9692 Backbone",              color: "#3B82F6" },
    { name: "ACU-IT Processing",             color: "#dc2626" }
  ]
};

export const LIVE_FRAG_SCENARIO = {
  title: "Ouster OS-1-16 IP Fragmented \u2014 384 frags/frame, 100ms cycle",
  description: "Same Ouster data but with <strong>IP fragmentation</strong> at MTU 1500. Each 3,328B UDP packet becomes 3 IP fragments (<strong>1480+1480+376 bytes</strong>). Per frame: 128 pkts \u00d7 3 = <strong>384 fragments</strong>. Smaller fragments reduce per-hop Tx time to <strong>11.8\u00b5s</strong> (3-hop E2E = 46\u00b5s) but dramatically increase GCL entry count. Total fragments per cycle: 384 (Ouster \u00d72) + 46 (Pandar \u00d72) + 60 (Radar \u00d75) = <strong>~1068 fragments</strong>.",
  flows: [
    { name: "Ouster FC \u2192 ACU-IT",    color: "#10B981", desc: "1480B \u00d7384 frags, P7, 260\u00b5s period (11.8\u00b5s tx)" },
    { name: "Ouster Rear \u2192 ACU-IT",  color: "#10B981", desc: "1480B \u00d7384 frags, P7, 260\u00b5s period (11.8\u00b5s tx)" },
    { name: "Pandar FL \u2192 ACU-IT",    color: "#0D9488", desc: "1480B \u00d746 frags, P7, 2174\u00b5s period (11.8\u00b5s tx)" },
    { name: "Pandar FR \u2192 ACU-IT",    color: "#0D9488", desc: "1480B \u00d746 frags, P7, 2174\u00b5s period (11.8\u00b5s tx)" },
    { name: "MRR-35 F \u2192 ACU-IT",    color: "#952aff", desc: "1480B \u00d760 frags, P6, 1667\u00b5s period (11.8\u00b5s tx)" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "1480B \u00d760 frags, P6, 1667\u00b5s period (11.8\u00b5s tx)" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "1480B \u00d760 frags, P6, 1667\u00b5s period (11.8\u00b5s tx)" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "1480B \u00d760 frags, P6, 1667\u00b5s period (11.8\u00b5s tx)" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "1480B \u00d760 frags, P6, 1667\u00b5s period (11.8\u00b5s tx)" }
  ],
  domains: [
    { name: "Ouster OS-1-16 Fragments (1Gbps)", color: "#10B981" },
    { name: "Pandar 40P Fragments (1Gbps)",      color: "#0D9488" },
    { name: "MRR-35 Fragments (1Gbps)",          color: "#952aff" },
    { name: "LAN9692 Backbone",                  color: "#3B82F6" },
    { name: "ACU-IT Processing",                 color: "#dc2626" }
  ]
};

/* ── Sensor Spec Table Rows ── */
export const LIVE_BURST_SPEC_ROWS = [
  { dot: "#10B981", sensor: "Front Center LiDAR", model: "Ouster OS-1-16-A0",  iface: "1000BASE-T", speed: "1000 Mbps", payload: "3,328 B",    period: "781\u00b5s",  tx: "26.6 \u00b5s",  pkts: "128/cycle" },
  { dot: "#0D9488", sensor: "Front Left LiDAR",   model: "Hesai Pandar 40P",    iface: "1000BASE-T1", speed: "1000 Mbps", payload: "32 KB",     period: "50ms",        tx: "262.4 \u00b5s", pkts: "2/cycle" },
  { dot: "#0D9488", sensor: "Front Right LiDAR",  model: "Hesai Pandar 40P",    iface: "1000BASE-T1", speed: "1000 Mbps", payload: "32 KB",     period: "50ms",        tx: "262.4 \u00b5s", pkts: "2/cycle" },
  { dot: "#10B981", sensor: "Rear LiDAR",          model: "Ouster OS-1-16-A0",  iface: "1000BASE-T", speed: "1000 Mbps", payload: "3,328 B",    period: "781\u00b5s",  tx: "26.6 \u00b5s",  pkts: "128/cycle" },
  { dot: "#952aff", sensor: "Front Radar",         model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "4 KB \u00d72", period: "5ms",      tx: "33.1 \u00b5s",  pkts: "20/cycle" },
  { dot: "#952aff", sensor: "Front-Left Corner",   model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "4 KB \u00d72", period: "5ms",      tx: "33.1 \u00b5s",  pkts: "20/cycle" },
  { dot: "#952aff", sensor: "Front-Right Corner",  model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "4 KB \u00d72", period: "5ms",      tx: "33.1 \u00b5s",  pkts: "20/cycle" },
  { dot: "#952aff", sensor: "Rear-Left Corner",    model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "4 KB \u00d72", period: "5ms",      tx: "33.1 \u00b5s",  pkts: "20/cycle" },
  { dot: "#952aff", sensor: "Rear-Right Corner",   model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "4 KB \u00d72", period: "5ms",      tx: "33.1 \u00b5s",  pkts: "20/cycle" }
];

export const LIVE_FRAG_SPEC_ROWS = [
  { dot: "#10B981", sensor: "Front Center LiDAR", model: "Ouster OS-1-16-A0",  iface: "1000BASE-T", speed: "1000 Mbps", payload: "1,480 B",   period: "260\u00b5s",  tx: "11.8 \u00b5s",  pkts: "384 frags/cycle" },
  { dot: "#0D9488", sensor: "Front Left LiDAR",   model: "Hesai Pandar 40P",    iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "2174\u00b5s", tx: "11.8 \u00b5s",  pkts: "46 frags/cycle" },
  { dot: "#0D9488", sensor: "Front Right LiDAR",  model: "Hesai Pandar 40P",    iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "2174\u00b5s", tx: "11.8 \u00b5s",  pkts: "46 frags/cycle" },
  { dot: "#10B981", sensor: "Rear LiDAR",          model: "Ouster OS-1-16-A0",  iface: "1000BASE-T", speed: "1000 Mbps", payload: "1,480 B",   period: "260\u00b5s",  tx: "11.8 \u00b5s",  pkts: "384 frags/cycle" },
  { dot: "#952aff", sensor: "Front Radar",         model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "1667\u00b5s", tx: "11.8 \u00b5s",  pkts: "60 frags/cycle" },
  { dot: "#952aff", sensor: "Front-Left Corner",   model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "1667\u00b5s", tx: "11.8 \u00b5s",  pkts: "60 frags/cycle" },
  { dot: "#952aff", sensor: "Front-Right Corner",  model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "1667\u00b5s", tx: "11.8 \u00b5s",  pkts: "60 frags/cycle" },
  { dot: "#952aff", sensor: "Rear-Left Corner",    model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "1667\u00b5s", tx: "11.8 \u00b5s",  pkts: "60 frags/cycle" },
  { dot: "#952aff", sensor: "Rear-Right Corner",   model: "Continental MRR-35",  iface: "1000BASE-T1", speed: "1000 Mbps", payload: "1,480 B",  period: "1667\u00b5s", tx: "11.8 \u00b5s",  pkts: "60 frags/cycle" }
];

/* ── TAS Simulation Results ── */
export const TAS_RESULTS = [
  { config: 'NoTAS (100%)', pass: 100, blocked: 0, maxDelay: 0, color: '#059669' },
  { config: 'TAS-80%', pass: 80, blocked: 20, maxDelay: 200, color: '#3B82F6' },
  { config: 'TAS-50%', pass: 49, blocked: 51, maxDelay: 500, color: '#d97706' },
  { config: 'TAS-20%', pass: 19, blocked: 81, maxDelay: 800, color: '#dc2626' }
];

/* ── Deadline Analysis Levels ── */
export const DEADLINE_LEVELS = [
  { name: 'Per Fragment', tx: 11.8, unit: '1480B', note: 'IP frag at MTU 1500' },
  { name: 'Per Datagram', tx: 26.7, unit: '3336B', note: 'UDP pkt (3328+8)' },
  { name: 'Frame Burst', tx: 3408, unit: '416KB', note: 'All 128 pkts at once' }
];

/* ── Link Failure Scenarios ── */
export const LINK_FAIL = {
  'fail-left-backbone':    { links: ['l_swfl_swrear'], desc: 'SW_FL\u2192SW_REAR link down \u2014 traffic reroutes via SW_FR' },
  'fail-right-backbone':   { links: ['l_swfr_swrear'], desc: 'SW_FR\u2192SW_REAR link down \u2014 traffic reroutes via SW_FL' },
  'fail-front-crosslink':  { links: ['l_swfl_swfr', 'l_swfr_swfl'], desc: 'SW_FL\u2194SW_FR crosslink down \u2014 front switches use direct backbone' }
};
