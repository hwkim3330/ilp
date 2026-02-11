/* ═══════════════════════════════════════════════
   roii-data.js — ROii Autonomous Shuttle TSN Scenario
   4 LiDAR + 5 Radar → Triangle Switch Topology → ADAS PC
   ═══════════════════════════════════════════════ */

export const ROII_MODEL = {
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
    // Switches — triangle topology
    { id: "SW_FL",   type: "switch" },
    { id: "SW_FR",   type: "switch" },
    { id: "SW_REAR", type: "switch" },
    // Processing
    { id: "ADAS_PC", type: "endstation" }
  ],
  links: [
    // Front-left sensors → SW_FL
    { id: "l_lidarfl_swfl",  from: "LIDAR_FL", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_lidarfc_swfl",  from: "LIDAR_FC", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfl_swfl",  from: "RADAR_FL", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfc_swfl",  from: "RADAR_FC", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Front-right sensors → SW_FR
    { id: "l_lidarfr_swfr",  from: "LIDAR_FR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfr_swfr",  from: "RADAR_FR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Rear sensors → SW_REAR
    { id: "l_lidarrc_swrear", from: "LIDAR_RC", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrl_swrear", from: "RADAR_RL", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrr_swrear", from: "RADAR_RR", to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    // Triangle switch interconnects (bidirectional)
    { id: "l_swfl_swfr",     from: "SW_FL",   to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swfr_swfl",     from: "SW_FR",   to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swfl_swrear",   from: "SW_FL",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swrear_swfl",   from: "SW_REAR", to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swfr_swrear",   from: "SW_FR",   to: "SW_REAR", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swrear_swfr",   from: "SW_REAR", to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Processing
    { id: "l_swrear_adas",   from: "SW_REAR", to: "ADAS_PC", rate_mbps: 1000, prop_delay_us: 0.5 }
  ],
  flows: [
    // LiDAR flows (P7, 1200B, period 500µs, deadline 200µs, 2 pkts/cycle)
    {
      id: "f_lidar_fl", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_lidar_fr", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_lidar_fc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_lidar_rc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_RC", dst: "ADAS_PC", k_paths: 2
    },
    // Radar flows (P6, 256B, period 1000µs, deadline 400µs, 1 pkt/cycle)
    {
      id: "f_radar_fc", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FC", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_radar_fl", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FL", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_radar_fr", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FR", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_radar_rl", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_RL", dst: "ADAS_PC", k_paths: 2
    },
    {
      id: "f_radar_rr", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_RR", dst: "ADAS_PC", k_paths: 2
    }
  ]
};

/* ── Fixed Node Positions (shuttle shape, front=top) ── */
export function getRoiiPositions(W, H) {
  return {
    // Top row — front sensors (전면)
    LIDAR_FL:  { x: W * 0.08, y: H * 0.08 },
    RADAR_FL:  { x: W * 0.22, y: H * 0.08 },
    LIDAR_FC:  { x: W * 0.38, y: H * 0.08 },
    RADAR_FC:  { x: W * 0.55, y: H * 0.08 },
    RADAR_FR:  { x: W * 0.72, y: H * 0.08 },
    LIDAR_FR:  { x: W * 0.90, y: H * 0.08 },
    // Upper-middle — front zone controllers
    SW_FL:     { x: W * 0.28, y: H * 0.35 },
    SW_FR:     { x: W * 0.72, y: H * 0.35 },
    // Lower-middle — rear sensors + rear gateway
    RADAR_RL:  { x: W * 0.12, y: H * 0.62 },
    SW_REAR:   { x: W * 0.50, y: H * 0.62 },
    RADAR_RR:  { x: W * 0.88, y: H * 0.62 },
    LIDAR_RC:  { x: W * 0.32, y: H * 0.76 },
    // Bottom — ADAS PC (후면)
    ADAS_PC:   { x: W * 0.50, y: H * 0.93 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const ROII_NODE_COLORS = {
  // LiDAR — light green tint
  LIDAR_FL:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FL", shortLabel: "LiDAR" },
  LIDAR_FR:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FR", shortLabel: "LiDAR" },
  LIDAR_FC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FC", shortLabel: "LiDAR" },
  LIDAR_RC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR RC", shortLabel: "LiDAR" },
  // Radar — light purple tint
  RADAR_FC:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FC", shortLabel: "Radar" },
  RADAR_FL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FL", shortLabel: "Radar" },
  RADAR_FR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FR", shortLabel: "Radar" },
  RADAR_RL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RL", shortLabel: "Radar" },
  RADAR_RR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RR", shortLabel: "Radar" },
  // LAN9662 front switches — light blue tint
  SW_FL:     { fill: "#dbeafe", stroke: "#3B82F6", label: "SW FL",    shortLabel: "LAN9662" },
  SW_FR:     { fill: "#dbeafe", stroke: "#3B82F6", label: "SW FR",    shortLabel: "LAN9662" },
  // LAN9692 rear gateway — light cyan tint
  SW_REAR:   { fill: "#cffafe", stroke: "#06B6D4", label: "SW Rear",  shortLabel: "LAN9692" },
  // ADAS PC — light amber tint
  ADAS_PC:   { fill: "#fef3c7", stroke: "#f59e0b", label: "ADAS PC",  shortLabel: "PC" }
};

/* ── 3D Node Positions (on shuttle body, front=+Z) ── */
export const ROII_3D_POSITIONS = {
  // LiDAR — roof-mounted
  LIDAR_FL:  { x: -6,  y: 8.5, z: 15 },
  LIDAR_FC:  { x:  0,  y: 9.5, z: 18 },
  LIDAR_FR:  { x:  6,  y: 8.5, z: 15 },
  LIDAR_RC:  { x:  0,  y: 9,   z:-16 },
  // Radar — bumper-level
  RADAR_FC:  { x:  0,  y: 3,   z: 20 },
  RADAR_FL:  { x: -7,  y: 3.5, z: 13 },
  RADAR_FR:  { x:  7,  y: 3.5, z: 13 },
  RADAR_RL:  { x: -7,  y: 3.5, z:-13 },
  RADAR_RR:  { x:  7,  y: 3.5, z:-13 },
  // Switches — inside vehicle
  SW_FL:     { x: -4,  y: 5,   z:  8 },
  SW_FR:     { x:  4,  y: 5,   z:  8 },
  SW_REAR:   { x:  0,  y: 5,   z: -8 },
  // ADAS PC — rear floor
  ADAS_PC:   { x:  0,  y: 2.5, z:-15 }
};

/* ── Scenario Description ──────────────────────── */
export const ROII_SCENARIO = {
  title: "ROii Autonomous Shuttle TSN Network",
  description: "ROii autonomous shuttle sensor fusion network with 4 LiDAR and 5 Radar sensors. Three LAN966x switches form a triangle topology (Front-Left ZC, Front-Right ZC, Rear Gateway) connecting all sensors to a rear-mounted ADAS processing PC. IEEE 802.1Qbv GCL scheduling ensures deterministic delivery of safety-critical perception data.",
  flows: [
    { name: "LiDAR FL → ADAS PC", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR FR → ADAS PC", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR FC → ADAS PC", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR RC → ADAS PC", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "Radar FC → ADAS PC", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar FL → ADAS PC", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar FR → ADAS PC", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar RL → ADAS PC", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar RR → ADAS PC", color: "#952aff", desc: "256B detection, P6, 400µs deadline" }
  ],
  domains: [
    { name: "LiDAR Sensors",     color: "#10B981" },
    { name: "Radar Sensors",     color: "#952aff" },
    { name: "LAN9662 Front ZC",  color: "#3B82F6" },
    { name: "LAN9692 Rear GW",   color: "#06B6D4" },
    { name: "ADAS Processing",   color: "#f9a825" }
  ]
};
