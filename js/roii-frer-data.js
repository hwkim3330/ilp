/* ═══════════════════════════════════════════════
   roii-frer-data.js — ROii Multi-Path Route Selection
   Front Hub + Triangle Switch Topology
   ILP jointly optimizes route selection + GCL scheduling
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
    // Front Hub (aggregation point)
    { id: "HUB_F",    type: "switch" },
    // TSN Switches — triangle topology
    { id: "SW_FL",    type: "switch" },   // LAN9662 Front-Left
    { id: "SW_FR",    type: "switch" },   // LAN9662 Front-Right
    { id: "SW_REAR",  type: "switch" },   // LAN9692 Rear Gateway
    // Processing
    { id: "ACU_IT",   type: "endstation" }
  ],
  links: [
    // Front sensors → Hub
    { id: "l_lidarfl_hub",  from: "LIDAR_FL", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_lidarfr_hub",  from: "LIDAR_FR", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_lidarfc_hub",  from: "LIDAR_FC", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfc_hub",  from: "RADAR_FC", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfl_hub",  from: "RADAR_FL", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_radarfr_hub",  from: "RADAR_FR", to: "HUB_F",   rate_mbps: 1000, prop_delay_us: 0.3 },
    // Hub → Front switches (dual egress)
    { id: "l_hub_swfl",     from: "HUB_F",    to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_hub_swfr",     from: "HUB_F",    to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    // Front switch interconnect (bidirectional)
    { id: "l_swfl_swfr",    from: "SW_FL",    to: "SW_FR",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_swfr_swfl",    from: "SW_FR",    to: "SW_FL",   rate_mbps: 1000, prop_delay_us: 0.5 },
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
    // Front LiDAR (P7, 1200B, period 500µs, deadline 250µs) — k_paths=2
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
    // Rear LiDAR (single path)
    {
      id: "f_lidar_rc", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 250,
      traffic_type: "lidar", src: "LIDAR_RC", dst: "ACU_IT", k_paths: 1
    },
    // Front Radar (P6, 256B, period 1000µs, deadline 400µs) — k_paths=2
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
    // Rear Radar (single path)
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

/* ── Switch Definitions (for per-switch GCL view) ── */
export const FRER_SWITCHES = [
  { id: "HUB_F",   label: "Front Hub",                chip: "Hub",     color: "#f97316" },
  { id: "SW_FL",   label: "Front-Left Zone Controller", chip: "LAN9662", color: "#3B82F6" },
  { id: "SW_FR",   label: "Front-Right Zone Controller", chip: "LAN9662", color: "#3B82F6" },
  { id: "SW_REAR", label: "Rear Gateway",              chip: "LAN9692", color: "#06B6D4" }
];

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
    // Row 2 — front hub
    HUB_F:     { x: W * 0.50, y: H * 0.24 },
    // Row 3 — front switches (triangle top)
    SW_FL:     { x: W * 0.25, y: H * 0.44 },
    SW_FR:     { x: W * 0.75, y: H * 0.44 },
    // Row 4 — rear zone
    RADAR_RL:  { x: W * 0.10, y: H * 0.64 },
    SW_REAR:   { x: W * 0.50, y: H * 0.64 },
    RADAR_RR:  { x: W * 0.90, y: H * 0.64 },
    LIDAR_RC:  { x: W * 0.30, y: H * 0.78 },
    // Row 5 — ACU-IT
    ACU_IT:    { x: W * 0.50, y: H * 0.93 }
  };
}

/* ── Node Color Map ──────────────────────────── */
export const FRER_NODE_COLORS = {
  LIDAR_FL:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FL",     shortLabel: "LiDAR" },
  LIDAR_FR:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FR",     shortLabel: "LiDAR" },
  LIDAR_FC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR FC",     shortLabel: "LiDAR" },
  LIDAR_RC:  { fill: "#d1fae5", stroke: "#10B981", label: "LiDAR RC",     shortLabel: "LiDAR" },
  RADAR_FC:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FC",     shortLabel: "Radar" },
  RADAR_FL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FL",     shortLabel: "Radar" },
  RADAR_FR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar FR",     shortLabel: "Radar" },
  RADAR_RL:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RL",     shortLabel: "Radar" },
  RADAR_RR:  { fill: "#ede9fe", stroke: "#8B5CF6", label: "Radar RR",     shortLabel: "Radar" },
  HUB_F:     { fill: "#ffedd5", stroke: "#f97316", label: "Front Hub",    shortLabel: "Hub" },
  SW_FL:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-L ZC",   shortLabel: "LAN9662" },
  SW_FR:     { fill: "#dbeafe", stroke: "#3B82F6", label: "Front-R ZC",   shortLabel: "LAN9662" },
  SW_REAR:   { fill: "#cffafe", stroke: "#06B6D4", label: "Rear GW",      shortLabel: "LAN9692" },
  ACU_IT:    { fill: "#fef3c7", stroke: "#f59e0b", label: "ACU-IT",       shortLabel: "ECU" }
};

/* ── Scenario Description ──────────────────────── */
export const FRER_SCENARIO = {
  title: "ROii Multi-Path Route Selection",
  description: "Multi-path architecture with a front hub distributing sensor data to two front zone controllers (SW_FL, SW_FR). The three switches form a <strong>triangle topology</strong> (SW_FL &harr; SW_FR &harr; SW_REAR), giving each front flow <strong>two candidate routes</strong>. The ILP solver jointly optimizes <strong>route selection</strong> and <strong>GCL scheduling</strong>, balancing load while meeting all deadlines. Each switch egress port has its own GCL &mdash; transmissions on the same port must <strong>never overlap</strong>.",
  flows: [
    { name: "LiDAR FL → ACU-IT", color: "#10B981", desc: "1200B, P7 (TC7), 250µs deadline, 2 paths" },
    { name: "LiDAR FR → ACU-IT", color: "#10B981", desc: "1200B, P7 (TC7), 250µs deadline, 2 paths" },
    { name: "LiDAR FC → ACU-IT", color: "#10B981", desc: "1200B, P7 (TC7), 250µs deadline, 2 paths" },
    { name: "LiDAR RC → ACU-IT", color: "#10B981", desc: "1200B, P7 (TC7), 250µs deadline, 1 path" },
    { name: "Radar FC → ACU-IT", color: "#952aff", desc: "256B, P6 (TC6), 400µs deadline, 2 paths" },
    { name: "Radar FL → ACU-IT", color: "#952aff", desc: "256B, P6 (TC6), 400µs deadline, 2 paths" },
    { name: "Radar FR → ACU-IT", color: "#952aff", desc: "256B, P6 (TC6), 400µs deadline, 2 paths" },
    { name: "Radar RL → ACU-IT", color: "#952aff", desc: "256B, P6 (TC6), 400µs deadline, 1 path" },
    { name: "Radar RR → ACU-IT", color: "#952aff", desc: "256B, P6 (TC6), 400µs deadline, 1 path" }
  ],
  domains: [
    { name: "LiDAR (TC7)",        color: "#10B981" },
    { name: "Radar (TC6)",        color: "#952aff" },
    { name: "Front Hub",          color: "#f97316" },
    { name: "LAN9662 Front ZC",   color: "#3B82F6" },
    { name: "LAN9692 Rear GW",    color: "#06B6D4" },
    { name: "ACU-IT Processing",  color: "#f9a825" }
  ]
};
