/* ═══════════════════════════════════════════════
   roii-data.js — ROii Autonomous Shuttle TSN Scenario
   LAN9692 x3 (Front-L, Front-R, Rear GW) → ACU-IT
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
    { id: "SW_FL",   type: "switch" },   // LAN9692 Front-Left Zone Controller
    { id: "SW_FR",   type: "switch" },   // LAN9692 Front-Right Zone Controller
    { id: "SW_REAR", type: "switch" },   // LAN9692 Rear Gateway
    // Processing — rear-mounted
    { id: "ACU_IT",  type: "endstation" }
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
    // Rear Gateway → ACU-IT
    { id: "l_swrear_acu",    from: "SW_REAR", to: "ACU_IT",   rate_mbps: 1000, prop_delay_us: 0.5 }
  ],
  flows: [
    // LiDAR flows (P7, 1200B, period 500µs, deadline 200µs, 2 pkts/cycle)
    {
      id: "f_lidar_fl", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FL", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_lidar_fr", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FR", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_lidar_fc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_FC", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_lidar_rc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR_RC", dst: "ACU_IT", k_paths: 1
    },
    // Radar flows (P6, 256B, period 1000µs, deadline 400µs, 1 pkt/cycle)
    {
      id: "f_radar_fc", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FC", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_radar_fl", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FL", dst: "ACU_IT", k_paths: 1
    },
    {
      id: "f_radar_fr", priority: 6, payload_bytes: 256,
      period_us: 1000, deadline_us: 400,
      traffic_type: "radar", src: "RADAR_FR", dst: "ACU_IT", k_paths: 1
    },
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
export function getRoiiPositions(W, H) {
  return {
    // Top row — front sensors
    LIDAR_FL:  { x: W * 0.05, y: H * 0.08 },
    RADAR_FL:  { x: W * 0.20, y: H * 0.08 },
    LIDAR_FC:  { x: W * 0.38, y: H * 0.08 },
    RADAR_FC:  { x: W * 0.55, y: H * 0.08 },
    RADAR_FR:  { x: W * 0.72, y: H * 0.08 },
    LIDAR_FR:  { x: W * 0.92, y: H * 0.08 },
    // Upper-middle — front zone controllers (triangle top)
    SW_FL:     { x: W * 0.28, y: H * 0.32 },
    SW_FR:     { x: W * 0.72, y: H * 0.32 },
    // Lower-middle — rear sensors + rear gateway
    RADAR_RL:  { x: W * 0.12, y: H * 0.58 },
    SW_REAR:   { x: W * 0.50, y: H * 0.58 },
    RADAR_RR:  { x: W * 0.88, y: H * 0.58 },
    LIDAR_RC:  { x: W * 0.32, y: H * 0.72 },
    // Bottom — ACU-IT (rear)
    ACU_IT:    { x: W * 0.50, y: H * 0.92 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const ROII_NODE_COLORS = {
  // LiDAR — light green tint
  LIDAR_FL:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FL",   shortLabel: "LiDAR" },
  LIDAR_FR:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FR",   shortLabel: "LiDAR" },
  LIDAR_FC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FC",   shortLabel: "LiDAR" },
  LIDAR_RC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR RC",   shortLabel: "LiDAR" },
  // Radar — light purple tint
  RADAR_FC:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FC",   shortLabel: "Radar" },
  RADAR_FL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FL",   shortLabel: "Radar" },
  RADAR_FR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FR",   shortLabel: "Radar" },
  RADAR_RL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RL",   shortLabel: "Radar" },
  RADAR_RR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RR",   shortLabel: "Radar" },
  // LAN9692 Front Zone Controllers — light blue tint
  SW_FL:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-L ZC", shortLabel: "LAN9692" },
  SW_FR:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-R ZC", shortLabel: "LAN9692" },
  // LAN9692 Rear Gateway — light cyan tint
  SW_REAR:   { fill: "#cffafe", stroke: "#06B6D4", label: "Rear GW",    shortLabel: "LAN9692" },
  // ACU-IT — light amber tint
  ACU_IT:    { fill: "#fef3c7", stroke: "#f59e0b", label: "ACU-IT",     shortLabel: "ECU" }
};

/* ── 3D Node Positions (from latest web roii project) ── */
export const ROII_3D_POSITIONS = {
  // LiDAR — roof-mounted
  LIDAR_FL:  { x: -8.5, y: 10,   z: 16.2 },
  LIDAR_FC:  { x:  0,   y:  5.5, z: 18.5 },
  LIDAR_FR:  { x:  8.5, y: 10,   z: 16.2 },
  LIDAR_RC:  { x:  0,   y:  5.5, z:-18.5 },
  // Radar — mid-height
  RADAR_FC:  { x:  0,   y:  7,   z: 18.5 },
  RADAR_FL:  { x: -7,   y:  6.5, z: 17.5 },
  RADAR_FR:  { x:  7,   y:  6.5, z: 17.5 },
  RADAR_RL:  { x: -7,   y:  6.5, z:-18 },
  RADAR_RR:  { x:  7,   y:  6.5, z:-18 },
  // Switches — inside vehicle
  SW_FL:     { x: -4,   y:  2,   z: 10 },   // Front-Left Zone Controller
  SW_FR:     { x:  4,   y:  2,   z: 10 },   // Front-Right Zone Controller
  SW_REAR:   { x:  0,   y:  2,   z: -8 },   // Rear Gateway (LAN9692)
  // ACU-IT — rear-mounted
  ACU_IT:    { x:  0,   y:  2,   z:-15 }
};

/* ── Radar Tilts (from latest web roii project) ── */
export const ROII_3D_TILTS = {
  RADAR_FL:  { y: -Math.PI / 6 },
  RADAR_FR:  { y:  Math.PI / 6 },
  RADAR_RL:  { y:  Math.PI / 6 },
  RADAR_RR:  { y: -Math.PI / 6 }
};

/* ── Switch Definitions (for per-switch GCL view) ── */
export const ROII_SWITCHES = [
  { id: "SW_FL",   label: "Front-Left Zone Controller",  chip: "LAN9692", color: "#3B82F6" },
  { id: "SW_FR",   label: "Front-Right Zone Controller", chip: "LAN9692", color: "#3B82F6" },
  { id: "SW_REAR", label: "Rear Gateway",                chip: "LAN9692", color: "#06B6D4" }
];

/* ── Scenario Description ──────────────────────── */
export const ROII_SCENARIO = {
  title: "ROii Autonomous Shuttle TSN Network",
  description: "ROii autonomous shuttle sensor fusion network with 4 LiDAR and 5 Radar sensors. Three LAN9692 switches &mdash; two front zone controllers (Front-L, Front-R) and one rear gateway &mdash; form a triangle switch topology, connecting all sensors to the rear-mounted ACU-IT processing unit. IEEE 802.1Qbv GCL scheduling ensures deterministic delivery of safety-critical perception data.",
  flows: [
    { name: "LiDAR FL → ACU-IT", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR FR → ACU-IT", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR FC → ACU-IT", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "LiDAR RC → ACU-IT", color: "#10B981", desc: "1200B point cloud, P7, 200µs deadline, 2 pkts/cycle" },
    { name: "Radar FC → ACU-IT", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar FL → ACU-IT", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar FR → ACU-IT", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar RL → ACU-IT", color: "#952aff", desc: "256B detection, P6, 400µs deadline" },
    { name: "Radar RR → ACU-IT", color: "#952aff", desc: "256B detection, P6, 400µs deadline" }
  ],
  domains: [
    { name: "LiDAR Sensors",     color: "#10B981" },
    { name: "Radar Sensors",     color: "#952aff" },
    { name: "LAN9692 Front ZC",  color: "#3B82F6" },
    { name: "LAN9692 Rear GW",   color: "#06B6D4" },
    { name: "ACU-IT Processing", color: "#f9a825" }
  ]
};
