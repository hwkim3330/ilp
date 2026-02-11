/* ═══════════════════════════════════════════════
   roii-data.js — ROii Autonomous Shuttle TSN Scenario
   Real topology: Front-ZC + Rear-ZC + Central-GW → ADAS
   Matches original roii project (hwkim3330.github.io/roii)
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
    // Switches — matching original roii project
    { id: "FRONT_ZC",   type: "switch" },   // LAN9662 Front Zone Controller
    { id: "REAR_ZC",    type: "switch" },   // LAN9662 Rear Zone Controller
    { id: "CENTRAL_GW", type: "switch" },   // LAN9692 Central Gateway
    // Processing
    { id: "ADAS_PC", type: "endstation" }
  ],
  links: [
    // Front sensors → Front Zone Controller
    { id: "l_lidarfl_fzc",  from: "LIDAR_FL", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_lidarfr_fzc",  from: "LIDAR_FR", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_lidarfc_fzc",  from: "LIDAR_FC", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfc_fzc",  from: "RADAR_FC", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfl_fzc",  from: "RADAR_FL", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarfr_fzc",  from: "RADAR_FR", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Rear sensors → Rear Zone Controller
    { id: "l_lidarrc_rzc",  from: "LIDAR_RC", to: "REAR_ZC",    rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrl_rzc",  from: "RADAR_RL", to: "REAR_ZC",    rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radarrr_rzc",  from: "RADAR_RR", to: "REAR_ZC",    rate_mbps: 1000, prop_delay_us: 0.5 },
    // Inter-switch (bidirectional for k_paths redundancy)
    { id: "l_fzc_cgw",      from: "FRONT_ZC",   to: "CENTRAL_GW", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_cgw_fzc",      from: "CENTRAL_GW", to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_rzc_cgw",      from: "REAR_ZC",    to: "CENTRAL_GW", rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_cgw_rzc",      from: "CENTRAL_GW", to: "REAR_ZC",    rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_fzc_rzc",      from: "FRONT_ZC",   to: "REAR_ZC",    rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_rzc_fzc",      from: "REAR_ZC",    to: "FRONT_ZC",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Central Gateway → ADAS PC
    { id: "l_cgw_adas",     from: "CENTRAL_GW", to: "ADAS_PC",    rate_mbps: 1000, prop_delay_us: 0.5 }
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

/* ── Fixed Node Positions (2D topology view) ── */
export function getRoiiPositions(W, H) {
  return {
    // Top row — front sensors
    LIDAR_FL:    { x: W * 0.05, y: H * 0.08 },
    RADAR_FL:    { x: W * 0.20, y: H * 0.08 },
    LIDAR_FC:    { x: W * 0.38, y: H * 0.08 },
    RADAR_FC:    { x: W * 0.55, y: H * 0.08 },
    RADAR_FR:    { x: W * 0.72, y: H * 0.08 },
    LIDAR_FR:    { x: W * 0.92, y: H * 0.08 },
    // Upper-middle — Front Zone Controller
    FRONT_ZC:    { x: W * 0.50, y: H * 0.30 },
    // Center — Central Gateway + ADAS PC
    CENTRAL_GW:  { x: W * 0.35, y: H * 0.55 },
    ADAS_PC:     { x: W * 0.65, y: H * 0.55 },
    // Lower-middle — Rear Zone Controller
    REAR_ZC:     { x: W * 0.50, y: H * 0.72 },
    // Bottom row — rear sensors
    RADAR_RL:    { x: W * 0.20, y: H * 0.92 },
    LIDAR_RC:    { x: W * 0.50, y: H * 0.92 },
    RADAR_RR:    { x: W * 0.80, y: H * 0.92 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const ROII_NODE_COLORS = {
  // LiDAR — light green tint
  LIDAR_FL:    { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FL",    shortLabel: "LiDAR" },
  LIDAR_FR:    { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FR",    shortLabel: "LiDAR" },
  LIDAR_FC:    { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FC",    shortLabel: "LiDAR" },
  LIDAR_RC:    { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR RC",    shortLabel: "LiDAR" },
  // Radar — light purple tint
  RADAR_FC:    { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FC",    shortLabel: "Radar" },
  RADAR_FL:    { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FL",    shortLabel: "Radar" },
  RADAR_FR:    { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FR",    shortLabel: "Radar" },
  RADAR_RL:    { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RL",    shortLabel: "Radar" },
  RADAR_RR:    { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RR",    shortLabel: "Radar" },
  // LAN9662 Zone Controllers — light blue tint
  FRONT_ZC:    { fill: "#dbeafe", stroke: "#3B82F6", label: "Front ZC",    shortLabel: "LAN9662" },
  REAR_ZC:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Rear ZC",     shortLabel: "LAN9662" },
  // LAN9692 Central Gateway — light cyan tint
  CENTRAL_GW:  { fill: "#cffafe", stroke: "#06B6D4", label: "Central GW",  shortLabel: "LAN9692" },
  // ADAS PC — light amber tint
  ADAS_PC:     { fill: "#fef3c7", stroke: "#f59e0b", label: "ADAS PC",     shortLabel: "PC" }
};

/* ── 3D Node Positions (from original roii project) ── */
export const ROII_3D_POSITIONS = {
  // LiDAR — roof-mounted
  LIDAR_FL:    { x: -9,   y: 10,   z: 18 },
  LIDAR_FC:    { x:  0,   y:  6,   z: 20 },
  LIDAR_FR:    { x:  9,   y: 10,   z: 18 },
  LIDAR_RC:    { x:  0,   y:  6,   z:-20 },
  // Radar — bumper-level
  RADAR_FC:    { x:  0,   y:  2.5, z: 20 },
  RADAR_FL:    { x: -8,   y:  2.5, z: 19 },
  RADAR_FR:    { x:  8,   y:  2.5, z: 19 },
  RADAR_RL:    { x: -8,   y:  2.5, z:-19 },
  RADAR_RR:    { x:  8,   y:  2.5, z:-19 },
  // Switches — inside vehicle (original roii positions)
  FRONT_ZC:    { x:  0,   y:  2,   z: 10 },   // Front Zone Controller
  REAR_ZC:     { x:  0,   y:  2,   z:-10 },   // Rear Zone Controller
  CENTRAL_GW:  { x:  0,   y:  2,   z:  0 },   // Central Gateway (LAN9692)
  // ADAS PC — near center
  ADAS_PC:     { x: -3,   y:  2,   z:  3 }
};

/* ── Scenario Description ──────────────────────── */
export const ROII_SCENARIO = {
  title: "ROii Autonomous Shuttle TSN Network",
  description: "ROii autonomous shuttle sensor fusion network with 4 LiDAR and 5 Radar sensors. Front Zone Controller (LAN9662) aggregates 6 front sensors, Rear Zone Controller (LAN9662) aggregates 3 rear sensors. Central Gateway (LAN9692) bridges both zones to the ADAS processing unit. IEEE 802.1Qbv GCL scheduling ensures deterministic delivery of safety-critical perception data.",
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
    { name: "LiDAR Sensors",      color: "#10B981" },
    { name: "Radar Sensors",      color: "#952aff" },
    { name: "LAN9662 Zone Ctrl",  color: "#3B82F6" },
    { name: "LAN9692 Central GW", color: "#06B6D4" },
    { name: "ADAS Processing",    color: "#f9a825" }
  ]
};
