/* ═══════════════════════════════════════════════
   automotive-data.js — In-Vehicle TSN Scenario
   Realistic automotive Ethernet backbone model
   ═══════════════════════════════════════════════ */

export const AUTOMOTIVE_MODEL = {
  cycle_time_us: 500,
  guard_band_us: 3,
  processing_delay_us: 3,
  nodes: [
    { id: "CAMERA",       type: "endstation" },
    { id: "LIDAR",        type: "endstation" },
    { id: "RADAR",        type: "endstation" },
    { id: "ADAS_ECU",     type: "endstation" },
    { id: "SW1",          type: "switch" },
    { id: "GATEWAY",      type: "switch" },
    { id: "SW2",          type: "switch" },
    { id: "BRAKE_ECU",    type: "endstation" },
    { id: "POWERTRAIN",   type: "endstation" },
    { id: "INFOTAINMENT", type: "endstation" },
    { id: "BODY_CTRL",    type: "endstation" }
  ],
  links: [
    { id: "l_cam_sw1",      from: "CAMERA",    to: "SW1",       rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_lidar_sw1",    from: "LIDAR",     to: "SW1",       rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_radar_sw1",    from: "RADAR",     to: "SW1",       rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_sw1_adas",     from: "SW1",       to: "ADAS_ECU",  rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_sw1_gw",       from: "SW1",       to: "GATEWAY",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_gw_sw1",       from: "GATEWAY",   to: "SW1",       rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_gw_sw2",       from: "GATEWAY",   to: "SW2",       rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_sw2_gw",       from: "SW2",       to: "GATEWAY",   rate_mbps: 1000, prop_delay_us: 0.5 },
    { id: "l_adas_sw1",     from: "ADAS_ECU",  to: "SW1",       rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_sw2_brake",    from: "SW2",       to: "BRAKE_ECU", rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_sw2_pwr",      from: "SW2",       to: "POWERTRAIN",rate_mbps: 1000, prop_delay_us: 0.3 },
    { id: "l_gw_infotain",  from: "GATEWAY",   to: "INFOTAINMENT", rate_mbps: 1000, prop_delay_us: 0.8 },
    { id: "l_sw1_body",     from: "SW1",       to: "BODY_CTRL", rate_mbps: 100,  prop_delay_us: 0.5 }
  ],
  flows: [
    {
      id: "f_cam_adas", priority: 7, payload_bytes: 1400,
      period_us: 500, deadline_us: 100,
      traffic_type: "camera", src: "CAMERA", dst: "ADAS_ECU", k_paths: 2
    },
    {
      id: "f_lidar_adas", priority: 7, payload_bytes: 1200,
      period_us: 500, deadline_us: 200,
      traffic_type: "lidar", src: "LIDAR", dst: "ADAS_ECU", k_paths: 2
    },
    {
      id: "f_radar_adas", priority: 6, payload_bytes: 256,
      period_us: 500, deadline_us: 150,
      traffic_type: "radar", src: "RADAR", dst: "ADAS_ECU", k_paths: 2
    },
    {
      id: "f_adas_brake", priority: 7, payload_bytes: 64,
      period_us: 250, deadline_us: 50,
      traffic_type: "brake", src: "ADAS_ECU", dst: "BRAKE_ECU", k_paths: 2
    },
    {
      id: "f_adas_pwr", priority: 7, payload_bytes: 128,
      period_us: 250, deadline_us: 80,
      traffic_type: "powertrain", src: "ADAS_ECU", dst: "POWERTRAIN", k_paths: 2
    },
    {
      id: "f_cam_infotain", priority: 3, payload_bytes: 1024,
      period_us: 500, deadline_us: null,
      traffic_type: "infotainment", src: "CAMERA", dst: "INFOTAINMENT", k_paths: 2
    }
  ]
};

/* ── Fixed Node Positions (vehicle architecture layout) ── */
export function getAutomotivePositions(W, H) {
  return {
    // Sensors (top-left cluster)
    CAMERA:       { x: W * 0.08, y: H * 0.15 },
    LIDAR:        { x: W * 0.08, y: H * 0.45 },
    RADAR:        { x: W * 0.08, y: H * 0.75 },
    // ADAS zone (left-center)
    ADAS_ECU:     { x: W * 0.30, y: H * 0.30 },
    // Backbone switches (center)
    SW1:          { x: W * 0.42, y: H * 0.50 },
    GATEWAY:      { x: W * 0.58, y: H * 0.50 },
    SW2:          { x: W * 0.74, y: H * 0.50 },
    // Actuators (right)
    BRAKE_ECU:    { x: W * 0.92, y: H * 0.25 },
    POWERTRAIN:   { x: W * 0.92, y: H * 0.75 },
    // Infotainment + Body (bottom)
    INFOTAINMENT: { x: W * 0.58, y: H * 0.88 },
    BODY_CTRL:    { x: W * 0.42, y: H * 0.88 }
  };
}

/* ── Domain Color Map ──────────────────────────── */
export const AUTOMOTIVE_NODE_COLORS = {
  CAMERA:       { fill: "#1a3a6b", stroke: "#4895ef", label: "CAM",   shortLabel: "Sensor" },
  LIDAR:        { fill: "#0a3a3a", stroke: "#00f5d4", label: "LiDAR", shortLabel: "Sensor" },
  RADAR:        { fill: "#3a3000", stroke: "#f9a825", label: "Radar", shortLabel: "Sensor" },
  ADAS_ECU:     { fill: "#1a3a6b", stroke: "#4895ef", label: "ADAS",  shortLabel: "ECU" },
  SW1:          { fill: "#2a2060", stroke: "#7b61ff", label: "SW1",   shortLabel: "Switch" },
  GATEWAY:      { fill: "#2a2060", stroke: "#7b61ff", label: "GW",    shortLabel: "Gateway" },
  SW2:          { fill: "#2a2060", stroke: "#7b61ff", label: "SW2",   shortLabel: "Switch" },
  BRAKE_ECU:    { fill: "#3a1020", stroke: "#ff5252", label: "Brake", shortLabel: "ECU" },
  POWERTRAIN:   { fill: "#3a1020", stroke: "#ff5252", label: "PWR",   shortLabel: "ECU" },
  INFOTAINMENT: { fill: "#3a1040", stroke: "#f06292", label: "IVI",   shortLabel: "Head Unit" },
  BODY_CTRL:    { fill: "#0a3020", stroke: "#69f0ae", label: "Body",  shortLabel: "ECU" }
};

/* ── Scenario Description ──────────────────────── */
export const SCENARIO_DESC = {
  title: "Automotive In-Vehicle TSN Network",
  description: "A realistic automotive Ethernet backbone demonstrating IEEE 802.1Qbv Time-Aware Shaping for in-vehicle communication. The network connects ADAS sensors (camera, LiDAR, radar) through TSN switches to safety-critical actuator ECUs (brake, powertrain) and infotainment.",
  flows: [
    { name: "Camera \u2192 ADAS ECU", color: "#4895ef", desc: "1400B raw frame, P7, 100\u00b5s deadline" },
    { name: "LiDAR \u2192 ADAS ECU", color: "#00f5d4", desc: "1200B point cloud, P7, 200\u00b5s deadline" },
    { name: "Radar \u2192 ADAS ECU", color: "#f9a825", desc: "256B detection, P6, 150\u00b5s deadline" },
    { name: "ADAS \u2192 Brake ECU", color: "#ff5252", desc: "64B command, P7, 50\u00b5s deadline, 2 pkts/cycle" },
    { name: "ADAS \u2192 Powertrain", color: "#7b61ff", desc: "128B torque request, P7, 80\u00b5s deadline, 2 pkts/cycle" },
    { name: "Camera \u2192 Infotainment", color: "#f06292", desc: "1024B video stream, P3, best-effort" }
  ],
  domains: [
    { name: "ADAS / Perception", color: "#4895ef" },
    { name: "Chassis / Safety", color: "#ff5252" },
    { name: "Body Control", color: "#69f0ae" },
    { name: "Backbone / Network", color: "#7b61ff" },
    { name: "Infotainment", color: "#f06292" }
  ]
};
