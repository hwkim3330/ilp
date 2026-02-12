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

/* ═══════════════════════════════════════════════════
   3D Visualization Data (standard 13-node topology)
   ═══════════════════════════════════════════════════ */

/* ── 3D Positions (mapped from vehicle geometry) ── */
export const ROII_REAL_3D_POSITIONS = {
  LIDAR_FC:   { x:  0,    y: 5.5,  z: 18.5 },
  LIDAR_FL:   { x: -8.5,  y: 10,   z: 16.2 },
  LIDAR_FR:   { x:  8.5,  y: 10,   z: 16.2 },
  LIDAR_R:    { x:  0,    y: 5.5,  z:-18.5 },
  RADAR_F:    { x:  0,    y: 7,    z: 18.5 },
  RADAR_FLC:  { x: -7,    y: 6.5,  z: 17.5 },
  RADAR_FRC:  { x:  7,    y: 6.5,  z: 17.5 },
  RADAR_RLC:  { x: -7,    y: 6.5,  z:-18   },
  RADAR_RRC:  { x:  7,    y: 6.5,  z:-18   },
  SW_FL:      { x: -4,    y: 2,    z: 10   },
  SW_FR:      { x:  4,    y: 2,    z: 10   },
  SW_REAR:    { x:  0,    y: 2,    z: -8   },
  ACU_IT:     { x:  0,    y: 2,    z:-15   }
};

/* ── 3D Tilts (angled radar sensors) ── */
export const ROII_REAL_3D_TILTS = {
  RADAR_FLC: { y: -Math.PI / 6 },
  RADAR_FRC: { y:  Math.PI / 6 },
  RADAR_RLC: { y:  Math.PI / 6 },
  RADAR_RRC: { y: -Math.PI / 6 }
};

/* ── 3D Labels ── */
export const ROII_REAL_3D_LABELS = {
  LIDAR_FC:  'G32-Front-Center',  LIDAR_FL:  'Pandar-FL',
  LIDAR_FR:  'Pandar-FR',         LIDAR_R:   'G32-Rear',
  RADAR_F:   'MRR35-Front',       RADAR_FLC: 'MRR35-FLC',
  RADAR_FRC: 'MRR35-FRC',         RADAR_RLC: 'MRR35-RLC',
  RADAR_RRC: 'MRR35-RRC',
  SW_FL:     'Front-L ZC',        SW_FR:     'Front-R ZC',
  SW_REAR:   'Rear-GW',           ACU_IT:    'ACU-IT'
};

/* ── 3D Flow Paths (for animated particles) ── */
export const ROII_REAL_FLOW_PATHS = [
  { path: ['LIDAR_FC','SW_FL','SW_REAR','ACU_IT'],  color: 0x10B981 },
  { path: ['LIDAR_FL','SW_FL','SW_REAR','ACU_IT'],  color: 0x0D9488 },
  { path: ['LIDAR_FR','SW_FR','SW_REAR','ACU_IT'],  color: 0x0D9488 },
  { path: ['LIDAR_R','SW_REAR','ACU_IT'],           color: 0x10B981 },
  { path: ['RADAR_F','SW_FL','SW_REAR','ACU_IT'],   color: 0x952aff },
  { path: ['RADAR_FLC','SW_FL','SW_REAR','ACU_IT'], color: 0x952aff },
  { path: ['RADAR_FRC','SW_FR','SW_REAR','ACU_IT'], color: 0x952aff },
  { path: ['RADAR_RLC','SW_REAR','ACU_IT'],         color: 0x952aff },
  { path: ['RADAR_RRC','SW_REAR','ACU_IT'],         color: 0x952aff }
];

/* ── Device Type Classifier (for 3D templates) ── */
export function realGetDeviceType(nodeId) {
  if (nodeId === 'LIDAR_FC' || nodeId === 'LIDAR_R' ||
      nodeId === 'LIDAR_FC_L' || nodeId === 'LIDAR_FC_R') return 'lidar_g32';
  if (nodeId === 'LIDAR_FL' || nodeId === 'LIDAR_FR') return 'lidar_pandar';
  if (nodeId.startsWith('RADAR')) return 'radar';
  if (nodeId === 'SW_REAR') return 'switch_r';
  if (nodeId.startsWith('SW')) return 'switch_f';
  return 'ecu';
}

/* ═══════════════════════════════════════════════════
   Reconfigured Topology — Balanced Load Distribution
   LIDAR_FC → LIDAR_FC_L + LIDAR_FC_R (split G32)
   RADAR_F  → RADAR_F_L  + RADAR_F_R  (split MRR-35)
   15 nodes, 18 links, 11 flows
   ═══════════════════════════════════════════════════ */

const RECONF_NODES = [
  // LiDAR sensors (5) — FC split into L/R
  { id: "LIDAR_FC_L", type: "endstation" },  // G32 clone → SW_FL
  { id: "LIDAR_FC_R", type: "endstation" },  // G32 clone → SW_FR
  { id: "LIDAR_FL",   type: "endstation" },  // Pandar 40P
  { id: "LIDAR_FR",   type: "endstation" },  // Pandar 40P
  { id: "LIDAR_R",    type: "endstation" },  // G32
  // Radar sensors (6) — F split into L/R
  { id: "RADAR_F_L",  type: "endstation" },  // MRR-35 clone → SW_FL
  { id: "RADAR_F_R",  type: "endstation" },  // MRR-35 clone → SW_FR
  { id: "RADAR_FLC",  type: "endstation" },
  { id: "RADAR_FRC",  type: "endstation" },
  { id: "RADAR_RLC",  type: "endstation" },
  { id: "RADAR_RRC",  type: "endstation" },
  // Switches
  { id: "SW_FL",   type: "switch" },
  { id: "SW_FR",   type: "switch" },
  { id: "SW_REAR", type: "switch" },
  // Processing unit
  { id: "ACU_IT",  type: "endstation" }
];

const RECONF_LINKS = [
  // LiDAR → switches (balanced: 2 G32 split + 1 Pandar per front switch)
  { id: "l_lidarfcl_swfl",  from: "LIDAR_FC_L", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_lidarfcr_swfr",  from: "LIDAR_FC_R", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_lidarfl_swfl",   from: "LIDAR_FL",   to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 0.5 },
  { id: "l_lidarfr_swfr",   from: "LIDAR_FR",   to: "SW_FR",   rate_mbps: 100,  prop_delay_us: 0.5 },
  { id: "l_lidarr_swrear",  from: "LIDAR_R",    to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  // Radar → switches (balanced: 1 MRR split + 1 corner per front switch)
  { id: "l_radarfl_swfl",   from: "RADAR_F_L",  to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarfr_swfr",   from: "RADAR_F_R",  to: "SW_FR",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarflc_swfl",  from: "RADAR_FLC",  to: "SW_FL",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarfrc_swfr",  from: "RADAR_FRC",  to: "SW_FR",   rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarrlc_swrear",from: "RADAR_RLC",  to: "SW_REAR", rate_mbps: 100,  prop_delay_us: 1.0 },
  { id: "l_radarrrc_swrear",from: "RADAR_RRC",  to: "SW_REAR", rate_mbps: 100,  prop_delay_us: 1.0 },
  // Triangle switch backbone
  { id: "l_swfl_swfr",    from: "SW_FL",   to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swfl",    from: "SW_FR",   to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfl_swrear",  from: "SW_FL",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfl",  from: "SW_REAR", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swfr_swrear",  from: "SW_FR",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
  { id: "l_swrear_swfr",  from: "SW_REAR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
  // Gateway → Processing
  { id: "l_swrear_acu",   from: "SW_REAR", to: "ACU_IT",  rate_mbps: 1000, prop_delay_us: 0.3 }
];

/* ── Reconf GCD Model (10ms, 11 flows, 11 pkts/cycle) ── */
export const ROII_REAL_RECONF_GCD = {
  cycle_time_us: 10000,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: JSON.parse(JSON.stringify(RECONF_NODES)),
  links: JSON.parse(JSON.stringify(RECONF_LINKS)),
  flows: [
    // LiDAR flows (P7)
    { id: "f_lidar_fc_l", priority: 7, payload_bytes: 2048, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FC_L", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fc_r", priority: 7, payload_bytes: 2048, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FC_R", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fl", priority: 7, payload_bytes: 1200, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 1200, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_r",  priority: 7, payload_bytes: 2048, period_us: 10000, deadline_us: 5000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 1 },
    // Radar flows (P6)
    { id: "f_radar_f_l",  priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_F_L",  dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_f_r",  priority: 6, payload_bytes: 256, period_us: 10000, deadline_us: 2000,
      traffic_type: "radar", src: "RADAR_F_R",  dst: "ACU_IT", k_paths: 1 },
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

/* ── Reconf LCM Model (100ms, 11 flows, 40 pkts/cycle) ── */
export const ROII_REAL_RECONF_LCM = {
  cycle_time_us: 100000,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: JSON.parse(JSON.stringify(RECONF_NODES)),
  links: JSON.parse(JSON.stringify(RECONF_LINKS)),
  flows: [
    // LiDAR flows (P7, 50ms period → 2 pkts/cycle)
    { id: "f_lidar_fc_l", priority: 7, payload_bytes: 2048, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FC_L", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fc_r", priority: 7, payload_bytes: 2048, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FC_R", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fl", priority: 7, payload_bytes: 1200, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_fr", priority: 7, payload_bytes: 1200, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 1 },
    { id: "f_lidar_r",  priority: 7, payload_bytes: 2048, period_us: 50000, deadline_us: 10000,
      traffic_type: "lidar", src: "LIDAR_R",  dst: "ACU_IT", k_paths: 1 },
    // Radar flows (P6, 20ms period → 5 pkts/cycle)
    { id: "f_radar_f_l",  priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_F_L",  dst: "ACU_IT", k_paths: 1 },
    { id: "f_radar_f_r",  priority: 6, payload_bytes: 256, period_us: 20000, deadline_us: 5000,
      traffic_type: "radar", src: "RADAR_F_R",  dst: "ACU_IT", k_paths: 1 },
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

/* ── Reconf 2D Positions (15-node layout, 8 front-row sensors) ── */
export function getReconfPositions(W, H) {
  return {
    // Top row — 8 front sensors spread across width
    RADAR_FLC:  { x: W * 0.02, y: H * 0.06 },
    LIDAR_FL:   { x: W * 0.14, y: H * 0.06 },
    LIDAR_FC_L: { x: W * 0.26, y: H * 0.06 },
    RADAR_F_L:  { x: W * 0.38, y: H * 0.06 },
    RADAR_F_R:  { x: W * 0.52, y: H * 0.06 },
    LIDAR_FC_R: { x: W * 0.64, y: H * 0.06 },
    LIDAR_FR:   { x: W * 0.76, y: H * 0.06 },
    RADAR_FRC:  { x: W * 0.88, y: H * 0.06 },
    // Upper-middle — front zone controllers
    SW_FL:      { x: W * 0.28, y: H * 0.32 },
    SW_FR:      { x: W * 0.72, y: H * 0.32 },
    // Lower-middle — rear
    RADAR_RLC:  { x: W * 0.08, y: H * 0.60 },
    SW_REAR:    { x: W * 0.50, y: H * 0.58 },
    RADAR_RRC:  { x: W * 0.92, y: H * 0.60 },
    LIDAR_R:    { x: W * 0.32, y: H * 0.78 },
    // Bottom
    ACU_IT:     { x: W * 0.50, y: H * 0.92 }
  };
}

/* ── Reconf Node Colors ── */
export const ROII_RECONF_NODE_COLORS = {
  // Split G32 LiDARs — bright green
  LIDAR_FC_L: { fill: "#d1fae5", stroke: "#10B981", label: "G32 FC-L",     shortLabel: "G32" },
  LIDAR_FC_R: { fill: "#d1fae5", stroke: "#10B981", label: "G32 FC-R",     shortLabel: "G32" },
  LIDAR_R:    { fill: "#d1fae5", stroke: "#10B981", label: "G32 Rear",     shortLabel: "G32" },
  // Pandar 40P — teal
  LIDAR_FL:   { fill: "#ccfbf1", stroke: "#0D9488", label: "Pandar FL",    shortLabel: "P40P" },
  LIDAR_FR:   { fill: "#ccfbf1", stroke: "#0D9488", label: "Pandar FR",    shortLabel: "P40P" },
  // Split MRR-35 — purple
  RADAR_F_L:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 F-L",   shortLabel: "MRR" },
  RADAR_F_R:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 F-R",   shortLabel: "MRR" },
  RADAR_FLC:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 FLC",   shortLabel: "MRR" },
  RADAR_FRC:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 FRC",   shortLabel: "MRR" },
  RADAR_RLC:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 RLC",   shortLabel: "MRR" },
  RADAR_RRC:  { fill: "#ede9fe", stroke: "#952aff", label: "MRR-35 RRC",   shortLabel: "MRR" },
  // Switches
  SW_FL:      { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-L ZC",   shortLabel: "LAN9692" },
  SW_FR:      { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-R ZC",   shortLabel: "LAN9692" },
  SW_REAR:    { fill: "#cffafe", stroke: "#06B6D4", label: "Rear GW",      shortLabel: "LAN9692" },
  // ACU-IT
  ACU_IT:     { fill: "#fee2e2", stroke: "#dc2626", label: "ACU-IT",       shortLabel: "ECU" }
};

/* ── Reconf Scenario Descriptions ── */
export const ROII_RECONF_GCD_SCENARIO = {
  title: "ROii Reconfigured \u2014 Balanced GCD 10ms",
  description: "Reconfigured topology splits LIDAR_FC and RADAR_F into left/right instances for <strong>balanced load distribution</strong>: SW_FL gets 4 sensors (G32-L, Pandar-FL, MRR-F-L, MRR-FLC), SW_FR gets 4 sensors (G32-R, Pandar-FR, MRR-F-R, MRR-FRC), SW_REAR gets 3 (G32-Rear, MRR-RLC, MRR-RRC). <strong>15 nodes, 18 links, 11 flows</strong>, GCD 10ms cycle \u2014 11 pkts/cycle.",
  flows: [
    { name: "G32 FC-L \u2192 ACU-IT",     color: "#10B981", desc: "2048B, P7, 1000BASE-T1 \u2192 SW_FL" },
    { name: "G32 FC-R \u2192 ACU-IT",     color: "#10B981", desc: "2048B, P7, 1000BASE-T1 \u2192 SW_FR" },
    { name: "Pandar FL \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 100BASE-T1 \u2192 SW_FL" },
    { name: "Pandar FR \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 100BASE-T1 \u2192 SW_FR" },
    { name: "G32 Rear \u2192 ACU-IT",    color: "#10B981", desc: "2048B, P7, 1000BASE-T1 \u2192 SW_REAR" },
    { name: "MRR-35 F-L \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_FL" },
    { name: "MRR-35 F-R \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_FR" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_FL" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_FR" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_REAR" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, CAN-FD\u2192ETH \u2192 SW_REAR" }
  ],
  domains: [
    { name: "LiDAR G32 (1Gbps)",       color: "#10B981" },
    { name: "LiDAR Pandar 40P (100M)", color: "#0D9488" },
    { name: "Radar MRR-35 (CAN-FD)",   color: "#952aff" },
    { name: "LAN9692 Backbone",        color: "#3B82F6" },
    { name: "ACU-IT Processing",       color: "#dc2626" }
  ]
};

export const ROII_RECONF_LCM_SCENARIO = {
  title: "ROii Reconfigured \u2014 Balanced LCM 100ms",
  description: "Reconfigured balanced topology with LCM hyperperiod. 5 LiDAR flows at 50ms period (2 pkts each = 10 pkts) + 6 Radar flows at 20ms period (5 pkts each = 30 pkts) = <strong>40 packets total</strong>. Balanced switch load enables better utilization of backbone links.",
  flows: [
    { name: "G32 FC-L \u2192 ACU-IT",     color: "#10B981", desc: "2048B, P7, 50ms, 2 pkts/cycle" },
    { name: "G32 FC-R \u2192 ACU-IT",     color: "#10B981", desc: "2048B, P7, 50ms, 2 pkts/cycle" },
    { name: "Pandar FL \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 50ms, 2 pkts/cycle" },
    { name: "Pandar FR \u2192 ACU-IT",   color: "#0D9488", desc: "1200B, P7, 50ms, 2 pkts/cycle" },
    { name: "G32 Rear \u2192 ACU-IT",    color: "#10B981", desc: "2048B, P7, 50ms, 2 pkts/cycle" },
    { name: "MRR-35 F-L \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" },
    { name: "MRR-35 F-R \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" },
    { name: "MRR-35 FLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" },
    { name: "MRR-35 FRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" },
    { name: "MRR-35 RLC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" },
    { name: "MRR-35 RRC \u2192 ACU-IT",  color: "#952aff", desc: "256B, P6, 20ms, 5 pkts/cycle" }
  ],
  domains: [
    { name: "LiDAR G32 (1Gbps)",       color: "#10B981" },
    { name: "LiDAR Pandar 40P (100M)", color: "#0D9488" },
    { name: "Radar MRR-35 (CAN-FD)",   color: "#952aff" },
    { name: "LAN9692 Backbone",        color: "#3B82F6" },
    { name: "ACU-IT Processing",       color: "#dc2626" }
  ]
};

/* ── Reconf 3D Positions (15 nodes, FC split ±2, F split ±1.5) ── */
export const ROII_REAL_3D_POSITIONS_RECONF = {
  LIDAR_FC_L: { x: -2,    y: 5.5,  z: 18.5 },
  LIDAR_FC_R: { x:  2,    y: 5.5,  z: 18.5 },
  LIDAR_FL:   { x: -8.5,  y: 10,   z: 16.2 },
  LIDAR_FR:   { x:  8.5,  y: 10,   z: 16.2 },
  LIDAR_R:    { x:  0,    y: 5.5,  z:-18.5 },
  RADAR_F_L:  { x: -1.5,  y: 7,    z: 18.5 },
  RADAR_F_R:  { x:  1.5,  y: 7,    z: 18.5 },
  RADAR_FLC:  { x: -7,    y: 6.5,  z: 17.5 },
  RADAR_FRC:  { x:  7,    y: 6.5,  z: 17.5 },
  RADAR_RLC:  { x: -7,    y: 6.5,  z:-18   },
  RADAR_RRC:  { x:  7,    y: 6.5,  z:-18   },
  SW_FL:      { x: -4,    y: 2,    z: 10   },
  SW_FR:      { x:  4,    y: 2,    z: 10   },
  SW_REAR:    { x:  0,    y: 2,    z: -8   },
  ACU_IT:     { x:  0,    y: 2,    z:-15   }
};

/* ── Reconf 3D Labels ── */
export const ROII_REAL_3D_LABELS_RECONF = {
  LIDAR_FC_L: 'G32-FC-L',  LIDAR_FC_R: 'G32-FC-R',
  LIDAR_FL:   'Pandar-FL', LIDAR_FR:   'Pandar-FR',
  LIDAR_R:    'G32-Rear',
  RADAR_F_L:  'MRR35-F-L', RADAR_F_R:  'MRR35-F-R',
  RADAR_FLC:  'MRR35-FLC', RADAR_FRC:  'MRR35-FRC',
  RADAR_RLC:  'MRR35-RLC', RADAR_RRC:  'MRR35-RRC',
  SW_FL:      'Front-L ZC', SW_FR:     'Front-R ZC',
  SW_REAR:    'Rear-GW',    ACU_IT:    'ACU-IT'
};

/* ── Reconf 3D Flow Paths (11 animated particles) ── */
export const ROII_REAL_FLOW_PATHS_RECONF = [
  { path: ['LIDAR_FC_L','SW_FL','SW_REAR','ACU_IT'],  color: 0x10B981 },
  { path: ['LIDAR_FC_R','SW_FR','SW_REAR','ACU_IT'],  color: 0x10B981 },
  { path: ['LIDAR_FL','SW_FL','SW_REAR','ACU_IT'],    color: 0x0D9488 },
  { path: ['LIDAR_FR','SW_FR','SW_REAR','ACU_IT'],    color: 0x0D9488 },
  { path: ['LIDAR_R','SW_REAR','ACU_IT'],             color: 0x10B981 },
  { path: ['RADAR_F_L','SW_FL','SW_REAR','ACU_IT'],   color: 0x952aff },
  { path: ['RADAR_F_R','SW_FR','SW_REAR','ACU_IT'],   color: 0x952aff },
  { path: ['RADAR_FLC','SW_FL','SW_REAR','ACU_IT'],   color: 0x952aff },
  { path: ['RADAR_FRC','SW_FR','SW_REAR','ACU_IT'],   color: 0x952aff },
  { path: ['RADAR_RLC','SW_REAR','ACU_IT'],           color: 0x952aff },
  { path: ['RADAR_RRC','SW_REAR','ACU_IT'],           color: 0x952aff }
];
