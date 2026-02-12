/* ═══════════════════════════════════════════════
   roii-real-data.js — ROii Realistic Sensor Model
   GCD (10ms) & LCM (100ms) Cycle Time Strategies
   Mixed link speeds: 100BASE-T1, 1000BASE-T1, CAN-FD→ETH
   ═══════════════════════════════════════════════ */

/* ── Shared Topology ────────────────────────────── */
const NODES = [
  // LiDAR sensors (4)
  { id: "LIDAR_FC", type: "endstation" },  // Robosense G32, 1000BASE-T1
  { id: "LIDAR_FL", type: "endstation" },  // Hesai Pandar 40P, 100BASE-T1
  { id: "LIDAR_FR", type: "endstation" },  // Hesai Pandar 40P, 100BASE-T1
  { id: "LIDAR_R",  type: "endstation" },  // Robosense G32, 1000BASE-T1
  // Radar sensors (5) — Continental MRR-35, CAN-FD → Ethernet Gateway
  { id: "RADAR_F",   type: "endstation" },
  { id: "RADAR_FLC", type: "endstation" },
  { id: "RADAR_FRC", type: "endstation" },
  { id: "RADAR_RLC", type: "endstation" },
  { id: "RADAR_RRC", type: "endstation" },
  // Switches — LAN9692 triangle topology
  { id: "SW_FL",   type: "switch" },
  { id: "SW_FR",   type: "switch" },
  { id: "SW_REAR", type: "switch" },
  // Processing unit
  { id: "ACU_IT",  type: "endstation" }
];

const LINKS = [
  // LiDAR → switches (mixed 100/1000 Mbps based on sensor model)
  { id: "l_lidarfc_swfl",   from: "LIDAR_FC",  to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },  // G32 1000BASE-T1
  { id: "l_lidarfl_swfl",   from: "LIDAR_FL",  to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 0.5 },  // Pandar 40P 100BASE-T1
  { id: "l_lidarfr_swfr",   from: "LIDAR_FR",  to: "SW_FR",   rate_mbps: 100,  prop_delay_us: 0.5 },  // Pandar 40P 100BASE-T1
  { id: "l_lidarr_swrear",  from: "LIDAR_R",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },  // G32 1000BASE-T1
  // Radar → switches (100 Mbps CAN-FD gateway output)
  { id: "l_radarf_swfl",    from: "RADAR_F",   to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 1.0 },  // +CAN-FD GW latency
  { id: "l_radarflc_swfl",  from: "RADAR_FLC", to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarfrc_swfr",  from: "RADAR_FRC", to: "SW_FR",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarrlc_swrear",from: "RADAR_RLC", to: "SW_REAR", rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarrrc_swrear",from: "RADAR_RRC", to: "SW_REAR", rate_mbps: 100,  prop_delay_us: 1.0 },
  // Triangle switch backbone (1000 Mbps bidirectional)
  { id: "l_swfl_swfr",    from: "SW_FL",   to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swfl",    from: "SW_FR",   to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfl_swrear",  from: "SW_FL",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfl",  from: "SW_REAR", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swrear",  from: "SW_FR",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfr",  from: "SW_REAR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  // Gateway → Processing
  { id: "l_swrear_acu",   from: "SW_REAR", to: "ACU_IT",  rate_mbps: 1000, prop_delay_us: 0.3 }
];

/* ── GCD Model (10ms = GCD(50ms, 20ms)) ─────────── */
export const ROII_REAL_GCD = {
  cycle_time_us: 10000,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: JSON.parse(JSON.stringify(NODES)),
  links: JSON.parse(JSON.stringify(LINKS)),
  flows: [
    // LiDAR flows (P7, feature data, period = cycle for GCD model)
    { id: "f_lidar_fc", priority: 7, payload_bytes: 2048, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fl", priority: 7, payload_bytes: 1200, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 1200, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_r",  priority: 7, payload_bytes: 2048, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 1 },
    // Radar flows (P6, object list, period = cycle for GCD model)
    { id: "f_radar_f",   priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_F",   dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_flc", priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_FLC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_frc", priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_FRC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_rlc", priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_RLC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_rrc", priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_RRC", dst: "ACU_IT", k_paths: 1 }
  ]
};

/* ── LCM Model (100ms = LCM(50ms, 20ms)) ────────── */
export const ROII_REAL_LCM = {
  cycle_time_us: 100000,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: JSON.parse(JSON.stringify(NODES)),
  links: JSON.parse(JSON.stringify(LINKS)),
  flows: [
    // LiDAR flows (P7, period 50ms → 2 pkts/100ms cycle)
    { id: "f_lidar_fc", priority: 7, payload_bytes: 2048, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fl", priority: 7, payload_bytes: 1200, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 1200, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_r",  priority: 7, payload_bytes: 2048, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 1 },
    // Radar flows (P6, period 20ms → 5 pkts/100ms cycle)
    { id: "f_radar_f",   priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_F",   dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_flc", priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FLC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_frc", priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_FRC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_rlc", priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RLC", dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_rrc", priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_RRC", dst: "ACU_IT", k_paths: 1 }
  ]
};

/* ── Fixed Node Positions (vehicle top-down layout) ── */
export function getRealPositions(W, H) {
  return {
    // Top row — front sensors spread across width
    RADAR_FLC: { x: W * 0.03, y: H * 0.06 },
    LIDAR_FL:  { x: W * 0.18, y: H * 0.06 },
    LIDAR_FC:  { x: W * 0.38, y: H * 0.06 },
    RADAR_F:   { x: W * 0.50, y: H * 0.06 },
    LIDAR_FR:  { x: W * 0.62, y: H * 0.06 },
    RADAR_FRC: { x: W * 0.82, y: H * 0.06 },
    // Upper-middle — front zone controllers
    SW_FL:     { x: W * 0.28, y: H * 0.32 },
    SW_FR:     { x: W * 0.72, y: H * 0.32 },
    // Lower-middle — rear sensors + rear gateway + ACU
    RADAR_RLC: { x: W * 0.08, y: H * 0.60 },
    SW_REAR:   { x: W * 0.50, y: H * 0.58 },
    RADAR_RRC: { x: W * 0.92, y: H * 0.60 },
    LIDAR_R:   { x: W * 0.32, y: H * 0.78 },
    // Bottom — ACU-IT
    ACU_IT:    { x: W * 0.50, y: H * 0.92 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const ROII_REAL_NODE_COLORS = {
  // LiDAR G32 (1Gbps) — bright green
  LIDAR_FC:  { fill: "#d1fae5", stroke: "#10B981", label: "G32 FC",       shortLabel: "G32" },
  LIDAR_R:   { fill: "#d1fae5", stroke: "#10B981", label: "G32 Rear",     shortLabel: "G32" },
  // LiDAR Pandar 40P (100Mbps) — teal green
  LIDAR_FL:  { fill: "#ccfbf1", stroke: "#0D9488", label: "Pandar FL",    shortLabel: "P40P" },
  LIDAR_FR:  { fill: "#ccfbf1", stroke: "#0D9488", label: "Pandar FR",    shortLabel: "P40P" },
  // Radar MRR-35 — purple
  RADAR_F:   { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 F",     shortLabel: "MRR" },
  RADAR_FLC: { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 FLC",   shortLabel: "MRR" },
  RADAR_FRC: { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 FRC",   shortLabel: "MRR" },
  RADAR_RLC: { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 RLC",   shortLabel: "MRR" },
  RADAR_RRC: { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 RRC",   shortLabel: "MRR" },
  // Switches — blue
  SW_FL:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-L ZC",   shortLabel: "LAN9692" },
  SW_FR:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-R ZC",   shortLabel: "LAN9692" },
  SW_REAR:   { fill: "#cffafe", stroke: "#06B6D4", label: "Rear GW",      shortLabel: "LAN9692" },
  // ACU-IT — red
  ACU_IT:    { fill: "#fee2e2", stroke: "#dc2626", label: "ACU-IT",       shortLabel: "ECU" }
};

/* ── Switch Definitions ──────────────────────── */
export const ROII_REAL_SWITCHES = [
  { id: "SW_FL",   label: "Front-Left ZC (LAN9692)",  chip: "LAN9692", color: "#3B82F6" },
  { id: "SW_FR",   label: "Front-Right ZC (LAN9692)", chip: "LAN9692", color: "#3B82F6" },
  { id: "SW_REAR", label: "Rear Gateway (LAN9692)",   chip: "LAN9692", color: "#06B6D4" }
];

/* ── Flow Color Function ─────────────────────── */
export function realFlowColor(fid) {
  const id = (fid || '').toLowerCase();
  if (id.includes('lidar')) return '#10B981';
  if (id.includes('radar')) return '#952aff';
  return '#3B82F6';
}

/* ── Scenario Descriptions ───────────────────── */
export const ROII_REAL_GCD_SCENARIO = {
  title: "ROii Realistic \u2014 GCD 10ms Cycle",
  description: "Realistic ROii shuttle with actual sensor hardware: Robosense G32 (1000BASE-T1), Hesai Pandar 40P (100BASE-T1), and Continental MRR-35 (CAN-FD \u2192 ETH gateway at 100 Mbps). <strong>GCD strategy</strong>: cycle time = GCD(50ms, 20ms) = 10ms, the minimal repeating GCL unit. Each flow produces 1 packet per cycle (9 pkts total). Mixed link speeds create realistic bottlenecks \u2014 100 Mbps sensor links are 10\u00d7 slower than the 1 Gbps backbone.",
  flows: [
    { name: "G32 FC \u2192 ACU-IT",      color: "#10B981", desc: "2048B feature, P7, 1000BASE-T1 (16.7\u00b5s tx)" },
    { name: "Pandar FL \u2192 ACU-IT",   color: "#0D9488", desc: "1200B feature, P7, 100BASE-T1 (99.0\u00b5s tx)" },
    { name: "Pandar FR \u2192 ACU-IT",   color: "#0D9488", desc: "1200B feature, P7, 100BASE-T1 (99.0\u00b5s tx)" },
    { name: "G32 Rear \u2192 ACU-IT",    color: "#10B981", desc: "2048B feature, P7, 1000BASE-T1 (16.7\u00b5s tx)" },
    { name: "MRR-35 F \u2192 ACU-IT",    color: "#952aff", desc: "256B obj list, P6, CAN-FD\u2192ETH (23.5\u00b5s tx)" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "256B obj list, P6, CAN-FD\u2192ETH (23.5\u00b5s tx)" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "256B obj list, P6, CAN-FD\u2192ETH (23.5\u00b5s tx)" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "256B obj list, P6, CAN-FD\u2192ETH (23.5\u00b5s tx)" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "256B obj list, P6, CAN-FD\u2192ETH (23.5\u00b5s tx)" }
  ],
  domains: [
    { name: "LiDAR G32 (1Gbps)",       color: "#10B981" },
    { name: "LiDAR Pandar 40P (100M)", color: "#0D9488" },
    { name: "Radar MRR-35 (CAN-FD)",   color: "#952aff" },
    { name: "LAN9692 Backbone",        color: "#3B82F6" },
    { name: "ACU-IT Processing",       color: "#dc2626" }
  ]
};

export const ROII_REAL_LCM_SCENARIO = {
  title: "ROii Realistic \u2014 LCM 100ms Hyperperiod",
  description: "Realistic ROii shuttle with actual sensor hardware: Robosense G32 (1000BASE-T1), Hesai Pandar 40P (100BASE-T1), and Continental MRR-35 (CAN-FD \u2192 ETH gateway at 100 Mbps). <strong>LCM strategy</strong>: cycle time = LCM(50ms, 20ms) = 100ms, the full hyperperiod. LiDAR flows produce 2 pkts/cycle (50ms period), Radar flows produce 5 pkts/cycle (20ms period) \u2014 <strong>33 packets total</strong>. This captures all periodic instances in a single GCL schedule.",
  flows: [
    { name: "G32 FC \u2192 ACU-IT",      color: "#10B981", desc: "2048B, P7, 50ms period, 2 pkts/cycle" },
    { name: "Pandar FL \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 50ms period, 2 pkts/cycle" },
    { name: "Pandar FR \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 50ms period, 2 pkts/cycle" },
    { name: "G32 Rear \u2192 ACU-IT",    color: "#10B981", desc: "2048B, P7, 50ms period, 2 pkts/cycle" },
    { name: "MRR-35 F \u2192 ACU-IT",    color: "#952aff", desc: "256B, P6, 20ms period, 5 pkts/cycle" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms period, 5 pkts/cycle" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms period, 5 pkts/cycle" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms period, 5 pkts/cycle" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms period, 5 pkts/cycle" }
  ],
  domains: [
    { name: "LiDAR G32 (1Gbps)",       color: "#10B981" },
    { name: "LiDAR Pandar 40P (100M)", color: "#0D9488" },
    { name: "Radar MRR-35 (CAN-FD)",   color: "#952aff" },
    { name: "LAN9692 Backbone",        color: "#3B82F6" },
    { name: "ACU-IT Processing",       color: "#dc2626" }
  ]
};
