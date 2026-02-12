/* ═══════════════════════════════════════════════
   roii-frer-data.js — ROii FRER Scenario
   IEEE 802.1CB Frame Replication & Elimination
   Front Replicator → dual-path via SW_FL / SW_FR
   ═══════════════════════════════════════════════ */

export const FRER_MODEL = {
  cycle_time_us: 1000,
  guard_band_us: 1,
  processing_delay_us: 1,
  nodes: [
    // LiDAR sensors (4)
    { id: "LIDAR_FL", type: "endstation" },
    { id: "LIDAR_FR", type: "endstation" },
    { id: "LIDAR_FC", type: "endstation" },
    { id: "LIDAR_RC", type: "endstation" },
    // Radar sensors (5)
    { id: "RADAR_FC", type: "endstation" },
    { id: "RADAR_FL", type: "endstation" },
    { id: "RADAR_FR", type: "endstation" },
    { id: "RADAR_RL", type: "endstation" },
    { id: "RADAR_RR", type: "endstation" },
    // Front Replicator (IEEE 802.1CB)
    { id: "REP_F",    type: "switch" },
    // TSN Switches
    { id: "SW_FL",    type: "switch" },
    { id: "SW_FR",    type: "switch" },
    { id: "SW_REAR",  type: "switch" },
    // Processing
    { id: "ACU_IT",   type: "endstation" }
  ],
  links: [
    // Front sensors → Replicator
    { id: "l_lidarfl_rep",  from: "LIDAR_FL", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_lidarfr_rep",  from: "LIDAR_FR", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_lidarfc_rep",  from: "LIDAR_FC", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfc_rep",  from: "RADAR_FC", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfl_rep",  from: "RADAR_FL", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfr_rep",  from: "RADAR_FR", to: "REP_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    // Replicator → Front switches (dual path)
    { id: "l_rep_swfl",     from: "REP_F",    to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_rep_swfr",     from: "REP_F",    to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Front switches → Rear gateway
    { id: "l_swfl_swrear",  from: "SW_FL",    to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swfr_swrear",  from: "SW_FR",    to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    // Rear sensors → Rear gateway
    { id: "l_lidarrc_swrear", from: "LIDAR_RC", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrl_swrear", from: "RADAR_RL", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrr_swrear", from: "RADAR_RR", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    // Rear gateway → ACU-IT
    { id: "l_swrear_acu",   from: "SW_REAR",  to: "ACU_IT",  rate_mbps: 1000, prop_delay_us: 0.5 }
  ],
  flows: [
    // Front LiDAR flows (P7, 1200B, period 500µs, deadline 250µs) — k_paths=2 via REP_F
    {
      id: "f_lidar_fl", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 250,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 2
    },
    {
      id: "f_lidar_fr", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 250,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 2
    },
    {
      id: "f_lidar_fc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 250,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 2
    },
    // Rear LiDAR (single path — no replicator)
    {
      id: "f_lidar_rc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 250,
      traffic_type: "lidar", src: "LIDAR_RC", dst: "ACU_IT", k_paths: 1
    },
    // Front Radar flows (P6, 256B, period 1000µs, deadline 400µs) — k_paths=2 via REP_F
    {
      id: "f_radar_fc", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FC", dst: "ACU_IT", k_paths: 2
    },
    {
      id: "f_radar_fl", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FL", dst: "ACU_IT", k_paths: 2
    },
    {
      id: "f_radar_fr", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FR", dst: "ACU_IT", k_paths: 2
    },
    // Rear Radar flows (single path)
    {
      id: "f_radar_rl", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_RL", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_radar_rr", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_RR", dst: "ACU_IT", k_paths: 1
    }
  ]
};

/* ── Fixed Node Positions (2D topology view) ── */
export function getFrerPositions(W, H) {
  return {
    // Row 1 — front sensors
    LIDAR_FL:  { x: W * 0.04, y: H * 0.06 },
    RADAR_FL:  { x: W * 0.18, y: H * 0.06 },
    LIDAR_FC:  { x: W * 0.35, y: H * 0.06 },
    RADAR_FC:  { x: W * 0.52, y: H * 0.06 },
    RADAR_FR:  { x: W * 0.72, y: H * 0.06 },
    LIDAR_FR:  { x: W * 0.92, y: H * 0.06 },
    // Row 2 — replicator
    REP_F:     { x: W * 0.50, y: H * 0.26 },
    // Row 3 — front switches
    SW_FL:     { x: W * 0.25, y: H * 0.46 },
    SW_FR:     { x: W * 0.75, y: H * 0.46 },
    // Row 4 — rear zone
    RADAR_RL:  { x: W * 0.10, y: H * 0.66 },
    SW_REAR:   { x: W * 0.50, y: H * 0.66 },
    RADAR_RR:  { x: W * 0.90, y: H * 0.66 },
    LIDAR_RC:  { x: W * 0.30, y: H * 0.80 },
    // Row 5 — ACU-IT
    ACU_IT:    { x: W * 0.50, y: H * 0.94 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const FRER_NODE_COLORS = {
  // LiDAR — green
  LIDAR_FL:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FL",     shortLabel: "LiDAR" },
  LIDAR_FR:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FR",     shortLabel: "LiDAR" },
  LIDAR_FC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FC",     shortLabel: "LiDAR" },
  LIDAR_RC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR RC",     shortLabel: "LiDAR" },
  // Radar — purple
  RADAR_FC:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FC",     shortLabel: "Radar" },
  RADAR_FL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FL",     shortLabel: "Radar" },
  RADAR_FR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FR",     shortLabel: "Radar" },
  RADAR_RL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RL",     shortLabel: "Radar" },
  RADAR_RR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RR",     shortLabel: "Radar" },
  // Replicator — orange/amber
  REP_F:     { fill: "#ffedd5", stroke: "#f97316", label: "Replicator",   shortLabel: "802.1CB" },
  // LAN9662 Front — blue
  SW_FL:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-L ZC",   shortLabel: "LAN9662" },
  SW_FR:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-R ZC",   shortLabel: "LAN9662" },
  // LAN9692 Rear — cyan
  SW_REAR:   { fill: "#cffafe", stroke: "#06B6D4", label: "Rear GW",      shortLabel: "LAN9692" },
  // ACU-IT — amber
  ACU_IT:    { fill: "#fef3c7", stroke: "#f59e0b", label: "ACU-IT",       shortLabel: "ECU" }
};

/* ── Scenario Description ──────────────────────── */
export const FRER_SCENARIO = {
  title: "ROii FRER — Dual-Path Redundancy",
  description: "IEEE 802.1CB Frame Replication and Elimination for Reliability (FRER) architecture. A front replicator distributes all sensor data to both front switches (SW_FL, SW_FR), creating redundant paths to the ACU-IT. The ILP solver jointly optimizes <strong>route selection</strong> (which switch each flow traverses) and <strong>transmission scheduling</strong>, balancing load across both paths while meeting all deadlines.",
  flows: [
    { name: "LiDAR FL → ACU-IT", color: "#10B981", desc: "1200B, P7, 250µs deadline, 2 paths via REP_F" },
    { name: "LiDAR FR → ACU-IT", color: "#10B981", desc: "1200B, P7, 250µs deadline, 2 paths via REP_F" },
    { name: "LiDAR FC → ACU-IT", color: "#10B981", desc: "1200B, P7, 250µs deadline, 2 paths via REP_F" },
    { name: "LiDAR RC → ACU-IT", color: "#10B981", desc: "1200B, P7, 250µs deadline, 1 path (rear)" },
    { name: "Radar FC → ACU-IT", color: "#952aff", desc: "256B, P6, 400µs deadline, 2 paths via REP_F" },
    { name: "Radar FL → ACU-IT", color: "#952aff", desc: "256B, P6, 400µs deadline, 2 paths via REP_F" },
    { name: "Radar FR → ACU-IT", color: "#952aff", desc: "256B, P6, 400µs deadline, 2 paths via REP_F" },
    { name: "Radar RL → ACU-IT", color: "#952aff", desc: "256B, P6, 400µs deadline, 1 path (rear)" },
    { name: "Radar RR → ACU-IT", color: "#952aff", desc: "256B, P6, 400µs deadline, 1 path (rear)" }
  ],
  domains: [
    { name: "LiDAR Sensors",       color: "#10B981" },
    { name: "Radar Sensors",       color: "#952aff" },
    { name: "802.1CB Replicator",  color: "#f97316" },
    { name: "LAN9662 Front ZC",    color: "#3B82F6" },
    { name: "LAN9692 Rear GW",     color: "#06B6D4" },
    { name: "ACU-IT Processing",   color: "#f9a825" }
  ]
};
