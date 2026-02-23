# TSN/GCL ILP Solver

Browser-based IEEE 802.1Qbv Time-Aware Shaper (TAS) Gate Control List scheduler using Integer Linear Programming. Jointly optimizes **route selection + transmission timing** with GLPK/WASM — no server required.

> **Live Demo**: [https://hwkim3330.github.io/ilp/](https://hwkim3330.github.io/ilp/)

---

## Pages

| # | Page | Description | Key Feature |
|---|------|-------------|-------------|
| 1 | [ROii Realistic Sensor](roii-real.html) | Standard (13N) / Reconf (14N+REP) toggle | 802.1CB replicator, link failover |
| 2 | [ROii Streaming Sensor](roii-stream.html) | Burst vs Streaming mode comparison | Small UDP packets, 1.5ms cycle, 45 pkts |
| 3 | [ROii Balanced Grid](roii-grid.html) | 802.1CB FRER replicator topology | REP device, balanced load distribution |
| 4 | [ROii Optimal Tri-Star](roii-optimal.html) | 3x direct switch→ACU links | All 2-hop, ~50% delay reduction |
| 5 | [ROii Hardware-Accurate](roii-hw.html) | Direct / 1G GW / 10G-T1 GW comparison | Real H/W specs, mixed-speed links |
| 6 | [ILP Learning Mode](roii-learn.html) | Interactive ILP formulation explorer | Editable params, constraint viewer |
| 7 | [Scheduler Animation](roii-ilp-viz.html) | Step-by-step greedy scheduler visualization | Web Audio, animated Gantt, dark theme |
| 8 | [Branch & Bound](roii-bb.html) | Custom B&B solver with D3 tree | Real-time branching/pruning animation |
| 9 | [**Custom Playground**](roii-custom.html) | **Full interactive topology editor** | Add/edit/delete nodes/links/flows, JSON I/O |

---

## Quick Start

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

No build step, no npm, no framework. Just serve static files.

---

## Custom Playground (roii-custom.html)

The Custom Playground is a full-featured interactive TSN network editor. Everything below runs entirely in the browser.

### Topology Editing

| Action | How |
|--------|-----|
| **Add node** | Long-press (600ms) on empty canvas, or `Ctrl+K` → "Add Node" |
| **Delete node** | Right-click node → "Delete" (removes connected links & flows too) |
| **Edit node** | Right-click node → edit ID, Type (switch/endstation) |
| **Move node** | Drag node to reposition |
| **Add link** | Long-press (500ms) on a node → drag rubber-band to target node |
| **Delete link** | Right-click link → "Delete" (option: delete bidirectional pair) |
| **Edit link** | Right-click link → edit Rate (Mbps), Propagation Delay (us) |

### Flow Management

| Action | How |
|--------|-----|
| **Add flow** | Flow sidebar "+" button, or `Ctrl+K` → "Add Flow" |
| **Delete flow** | Click "×" on flow card |
| **Edit flow** | Click flow card or flow path line → edit all properties |
| **Select flow** | Click in sidebar → highlights path on topology |

**Editable flow properties:**
- Source / Destination node (dropdown)
- Payload size (64 B — 1 MB)
- Period (100 — 1,000,000 us)
- Deadline (100 — 1,000,000 us)
- Priority (0—7)
- k_paths (candidate route count)

### Global Parameters

Access via `Ctrl+K` command palette or Model tab in drawer:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Cycle Time | 1,000 — 50,000 us | 10,000 us | GCL hyper-period |
| Guard Band | 0 — 20 us | 3 us | Protection between TSN packets |
| Processing Delay | 0 — 20 us | 3 us | Per-switch forwarding delay |

### Solver

| Mode | Speed | Description |
|------|-------|-------------|
| **Greedy** | < 1 ms | Priority-based list scheduler (default) |
| **ILP** | 2—15 s | Exact GLPK/WASM optimizer |
| **Both** | — | Run both, compare results |

- **Auto-Solve**: Toggle on → re-solves automatically after every change
- **Dirty indicator**: Orange pulsing dot when model changed but not re-solved
- **ILP Timeout**: Adjustable 1—60 seconds

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `/` | Open command palette |
| `Escape` | Close palette / popovers |

### File I/O

| Action | Description |
|--------|-------------|
| **Export JSON** | Downloads `tsn-model-TIMESTAMP.json` with full model |
| **Import JSON** | Load previously saved model from file |
| **Preset loading** | Standard / Reconf / Optimal presets via top pills |

### Solution History

- Stores last 5 solutions as timestamped chips in the top bar
- Click any chip to restore that model + result
- Each entry: timestamp, solver method, objective value

### Visualizations (Bottom Drawer)

Drag the drawer handle to resize (collapsed → half → full). 8 tabs:

| Tab | Content |
|-----|---------|
| **Flows** | Flow card editor with live computed TX time and pkts/cycle |
| **Model** | Node/link list editor + global parameter sliders + solver settings |
| **GCL Gantt** | Per-link timeline with hatched guard bands, cross-flow hover highlight |
| **Delay** | E2E delay bar chart with deadline markers per flow |
| **Util** | Per-link utilization donut charts (flow / guard / BE) |
| **Switch GCL** | Per-switch cards with mini Gantt SVG + 8-queue gate mask blocks |
| **Table** | Packet schedule table (release, end, delay, deadline, slack, status) |
| **JSON** | Raw GCL output as collapsible JSON |

### 3D Picture-in-Picture

- Floating Three.js window with ROii shuttle GLB model
- Draggable title bar, resizable corner handle
- Expand (50vw×50vh) / Minimize (circular 48px) toggle
- Cross-view highlighting: hover node in 2D ↔ 3D sync

---

## Demo Pages

### ROii Realistic Sensor (`roii-real.html`)

2-mode toggle: **Standard** (13 nodes, 9 flows) vs **Reconfigured** (14 nodes + 802.1CB REP, 11 flows). Triangle backbone with 3 link failure scenarios. Sensors: AutoL G32 (128KB), Hesai Pandar 40P (32KB), Continental MRR-35 (4KB x2 at 50Hz).

### ROii Streaming Sensor (`roii-stream.html`)

Burst vs Streaming comparison. Streaming mode: sensors emit small UDP packets continuously (G32 LiDAR: 1200B every 100us, Pandar: every 300us, MRR-35 CAN2ETH: every 1500us). Cycle = 1.5ms, 45 pkts/cycle.

### ROii Balanced Grid (`roii-grid.html`)

IEEE 802.1CB Frame Replication and Elimination. REP device duplicates LIDAR_FC and RADAR_F frames to both SW_FL and SW_FR for balanced load. 14 nodes, 18 links, 11 flows.

### ROii Optimal Tri-Star (`roii-optimal.html`)

Each zone switch has a direct 1 Gbps link to ACU-IT. All flows are exactly 2 hops. Max E2E delay drops ~50% vs Standard. Triangle backbone used only for failover. 13 nodes, 18 links, 9 flows.

### ROii Hardware-Accurate (`roii-hw.html`)

Based on actual ROii sensor H/W specifications:

| Sensor | Count | Interface | Payload |
|--------|------:|-----------|---------|
| LiDAR (Solid-state 135deg) | 2 | 1000BASE-T1 | 128 KB |
| LiDAR (Rotating 360deg) | 2 | 1000BASE-T | 64 KB |
| Radar (MRR-35 class) | 6 | CAN-FD | 512 B |
| Camera (SONY IMX031) | 6+ | V-by-One@HS | Excluded from TSN |

3-mode comparison: Direct (no switch, zero contention), 1G Gateway (bottleneck ~31.7%), 10G-T1 Gateway (bottleneck ~3.2%).

### ILP Learning Mode (`roii-learn.html`)

Interactive tool for understanding the ILP formulation. Edit flow payloads, periods, deadlines, and global parameters in real-time. Shows variable counts, constraint breakdown, Big-M computation examples, and per-packet scheduling detail. Greedy vs ILP comparison.

### Scheduler Animation (`roii-ilp-viz.html`)

Watch the greedy scheduler fill the timeline step by step. Web Audio API tones for each packet placement. Dark theme, topology highlighting, conflict detection, real-time stats. Switch between Standard, Reconf, and Optimal models.

### Branch & Bound Solver (`roii-bb.html`)

Custom B&B ILP solver with D3 tree visualization. Watch branching, bounding, and pruning in real-time. Web Audio tones for each solver event. Full model — no simplification.

---

## JSON Model Schema

All pages and the solver engine use this model format. Use it to create custom topologies via Import JSON in the Custom Playground.

```jsonc
{
  // Global scheduling parameters
  "cycle_time_us": 10000,        // GCL hyper-period (us). Flow periods must divide this.
  "guard_band_us": 3,            // Guard band between TSN packets (us)
  "processing_delay_us": 3,      // Per-switch forwarding delay (us)

  // Network nodes
  "nodes": [
    { "id": "SW_FL",   "type": "switch" },
    { "id": "ACU_IT",  "type": "endstation" }
  ],

  // Directed links (add both directions for bidirectional)
  "links": [
    {
      "id": "l_swfl_acu",          // Unique link ID
      "from": "SW_FL",             // Source node ID
      "to": "ACU_IT",              // Destination node ID
      "rate_mbps": 1000,           // Link capacity (Mbps)
      "prop_delay_us": 0.5         // Propagation delay (us)
    }
  ],

  // Traffic flows
  "flows": [
    {
      "id": "f_lidar_fc",          // Unique flow ID
      "src": "LIDAR_FC",           // Source node ID
      "dst": "ACU_IT",             // Destination node ID
      "priority": 7,               // IEEE 802.1p priority (0-7, >=6 is TSN)
      "payload_bytes": 131072,     // Ethernet payload size (bytes)
      "period_us": 10000,          // Repetition period (must divide cycle_time_us)
      "deadline_us": 5000,         // Relative deadline from release (us), null = best-effort
      "traffic_type": "lidar",     // For coloring: lidar|radar|control|sensor|video
      "k_paths": 2                 // Candidate routes to generate (1-5, default 2)
    }
  ]
}
```

### Key formulas

```
tx_time_us = (payload_bytes + 38) * 8 / rate_mbps    // 38B = Ethernet overhead
packets_per_cycle = cycle_time_us / period_us
```

### TSN classification

A packet is classified as TSN (gets guard band + hard deadline) if:
- `priority >= 6`, OR
- `deadline_us` is not null

Best-effort packets (priority < 6, no deadline) are scheduled in remaining gaps.

---

## Solver API Reference (`js/ilp-core.js`)

The solver engine is a pure ES module with no dependencies (GLPK is optional for ILP mode).

### Core Functions

```javascript
import { solveGreedy, solveILP, expandPackets, generateKPaths } from './js/ilp-core.js';
```

#### `solveGreedy(model) → result`

Priority-based list scheduler. Instant (< 1ms). Deadlines are soft constraints (marks "MISS" but continues).

#### `async solveILP(model, glpk, opts?) → result`

Exact optimizer via GLPK/WASM. Options:
- `opts.tmlim` — Time limit in seconds (default: 15)

Two internal modes:
- **Fixed-route** (all flows have k_paths=1): No route selection variables, tighter bounds, faster
- **Multi-route** (any flow has k_paths>1): Adds binary z-variables for route selection

#### `expandPackets(model) → packet[]`

Converts flows into per-cycle packet instances. Each packet has release time, deadline, and candidate routes with per-hop timing.

#### `generateKPaths(adj, src, dst, k, maxDepth?) → linkId[][]`

DFS-based k-shortest simple paths. Returns up to k paths sorted by hop count.

### Visualization Functions

```javascript
import {
  renderMetrics,      // Summary KPI ribbon
  renderTopology,     // D3 force-directed graph
  renderGCL,          // Gantt chart timeline
  renderDelayChart,   // E2E delay bar chart
  renderUtilization,  // Per-link utilization bars/donuts
  renderSwitchGCL,    // Per-switch GCL detail cards
  renderTable         // Packet schedule HTML table
} from './js/ilp-core.js';
```

All renderers take `(model, result, opts?)` and write to DOM containers.

### Result Object

```jsonc
{
  "method": "Greedy (priority-based list scheduler)",
  "objective": 12345.6,            // Sum of TSN packet end-to-end delays (us)
  "worst_util_percent": 30.2,      // Max link utilization %

  "packetRows": [{
    "packet_id": "f_lidar_fc#0",
    "flow_id": "f_lidar_fc",
    "priority": 7,
    "selected_route": 0,           // Which candidate path was chosen
    "release_us": 0,
    "end_us": 2101.6,              // Finish time at destination
    "e2e_delay_us": 2101.6,
    "deadline_abs_us": 5000,
    "slack_us": 2898.4,            // Headroom before deadline miss
    "status": "OK",                // "OK" | "MISS" | "BE"
    "hops": [{
      "link_id": "l_lidarfc_swfl",
      "start_us": 0,
      "end_us": 1048.9,
      "duration_us": 1048.9
    }]
  }],

  "gcl": {
    "cycle_time_us": 10000,
    "links": {
      "l_swfl_acu": {
        "from": "SW_FL", "to": "ACU_IT",
        "entries": [{
          "gate_mask": "10000000",  // 8-queue bitmap (MSB=TC7)
          "start_us": 0,
          "end_us": 1048.9,
          "duration_us": 1048.9,
          "note": "f_lidar_fc#0"   // or "guard band" or "best-effort gap"
        }]
      }
    }
  },

  "stats": {
    "constraints": 156,
    "variables": 85,
    "binaries": 50,
    "runtime_ms": 12300,
    "fallback_packets": 0,         // Greedy: unschedulable packets
    "overlap_conflicts": 0
  }
}
```

### Gate Mask Encoding

8-bit string, MSB = TC7, LSB = TC0:
```
Priority 7 → "10000000" (TC7 open)
Priority 6 → "01000000" (TC6 open)
Guard band → "00000000" (all closed)
Best-effort → "00000001" (TC0 open)
```

---

## Data Presets (`js/roii-real-data.js`)

Pre-built ROii autonomous shuttle topologies with 2D/3D positions and metadata.

### Exported Models

| Export | Nodes | Links | Flows | Pkts/Cycle |
|--------|------:|------:|------:|-----------:|
| `ROII_REAL_STANDARD` | 13 | 17 | 9 | 14 |
| `ROII_REAL_RECONF` | 14 | 18 | 11 | 17 |
| `ROII_OPTIMAL` | 13 | 18 | 9 | 14 |
| `ROII_HW_DIRECT` | 11 | 4 | 4 | 4 |
| `ROII_HW_1G` | 14 | 17 | 10 | 14 |
| `ROII_HW_10G` | 14 | 17 | 10 | 14 |

### Exported Helpers

```javascript
// 2D position maps (returns {nodeId: {x, y}})
getRealPositions(W, H)       // Standard topology
getReconfPositions(W, H)     // Reconfigured topology
getOptimalPositions(W, H)    // Tri-Star topology
getHWDirectPositions(W, H)   // Hardware Direct
getHWSwitchedPositions(W, H) // Hardware Switched (1G/10G)

// Color/type helpers
realFlowColor(flowId)        // Hex color by flow ID pattern
hwFlowColor(flowId)
realGetDeviceType(nodeId)    // "lidar_g32" | "radar" | "switch_f" | etc.
hwGetDeviceType(nodeId)
```

### Node Color Map Format

```javascript
{
  "LIDAR_FC": {
    fill: "#dcfce7",     // Background color
    stroke: "#16a34a",   // Border color
    label: "Front Center LiDAR",
    shortLabel: "FC"     // 2-4 chars for compact display
  }
}
```

---

## ILP Formulation Summary

### Objective

Minimize total end-to-end delay of all TSN packets:

```
min  Σ (s_{p,last_hop} + tx_last + pd_last)    for all TSN packets p
```

### Constraints

1. **Hop chain**: `s_{p,h+1} >= s_{p,h} + tx_h + pd_h + proc_delay`
2. **Release time**: `s_{p,0} >= release_p`
3. **Deadline**: `s_{p,last} + tx_last + pd_last <= deadline_p`
4. **Non-overlap** (same link): Binary ordering variables with per-pair tight Big-M
5. **Route selection** (multi-route only): `Σ z_{p,r} = 1` per packet

### Optimization Techniques

- **Per-pair tight M**: Not global cycle_time, but pair-specific execution window bounds
- **Window pruning**: Skip ordering constraints for non-overlapping operation windows
- **Tight bounds**: Per-hop lower/upper bounds derived from release times and deadlines
- **Fixed-route shortcut**: When k_paths=1, eliminates all z-variables and uses simpler formulation

### Complexity

| Metric | Fixed-Route (k=1) | Multi-Route (k=2) |
|--------|-------------------:|-------------------:|
| Continuous vars | ~85 | ~309 |
| Binary vars | ~50 | ~229 |
| Solve time | ~12 s | ~15 s |

---

## Architecture

```
ilp/
├── index.html              Landing page (9 demo cards)
├── roii-real.html          Standard / Reconf topology
├── roii-stream.html        Burst vs Streaming comparison
├── roii-grid.html          802.1CB FRER topology
├── roii-optimal.html       Tri-Star optimal topology
├── roii-hw.html            Hardware-accurate (3 modes)
├── roii-learn.html         ILP learning mode
├── roii-ilp-viz.html       Scheduler animation
├── roii-bb.html            Branch & Bound visualization
├── roii-custom.html        Custom topology playground
├── style.css               Shared CSS (light theme)
├── js/
│   ├── ilp-core.js         Solver engine + D3 visualizations (1,317 lines)
│   └── roii-real-data.js   All topology data presets (962 lines)
├── vendor/
│   ├── d3.min.js           D3 v7 (280KB)
│   ├── glpk.js             GLPK browser build (250KB)
│   └── glpk.wasm           GLPK WASM binary (337KB)
├── roii.glb                3D shuttle model (3.5MB)
├── keti.png                KETI logo
└── server.js               Optional Node.js backend
```

### Visualization Stack

Each page includes up to 7 synchronized visualizations:

1. **3D Shuttle View** — Three.js r128 with GLB model, orbit controls, auto-rotate
2. **Network Topology** — D3.js with fixed positions, flow path animation
3. **GCL Gantt Chart** — Per-link timeline with hatched guard bands, cross-flow hover highlight
4. **Per-Switch GCL** — Gate control entries with 8-queue gate mask blocks + mini Gantt SVG
5. **E2E Delay Chart** — Bar chart with deadline markers
6. **Link Utilization** — Horizontal bars or donut charts per active link
7. **Packet Schedule Table** — Per-packet timing with status (OK/MISS/BE)

### Link Failure Scenarios

All switched topologies support link failure simulation via scenario buttons:
- Triangle backbone provides redundant paths
- BFS rerouting automatically finds alternate routes
- Failed links shown in red (2D + 3D)
- GCL re-solved after topology change

| Page | Scenario 1 | Scenario 2 | Scenario 3 |
|------|------------|------------|------------|
| roii-real | SW_FL→REAR fail | SW_FR→REAR fail | FL↔FR crosslink fail |
| roii-grid | REP→SW_FL fail | REP→SW_FR fail | SW_FL→REAR fail |
| roii-optimal | SW_FL→ACU fail | SW_FR→ACU fail | SW_REAR→ACU fail |

---

## Technologies

- **D3.js v7** — All 2D visualizations (topology, Gantt, charts)
- **Three.js r128** — 3D shuttle rendering with GLB model
- **GLPK/WASM** — GNU Linear Programming Kit (WebAssembly, ~500KB)
- **Web Audio API** — Sound effects in animation pages
- **IEEE 802.1Qbv** — Time-Aware Shaper standard
- Pure ES modules, no build step, no framework

---

## Topology Comparison

| Metric | Standard | Reconf (802.1CB) | Optimal Tri-Star |
|--------|----------|------------------|------------------|
| Nodes | 13 | 14 (+REP) | 13 |
| Links | 17 | 18 | 18 |
| Flows | 9 | 11 (+2 replicated) | 9 |
| Pkts/Cycle | 14 | 17 (+3 replicated) | 14 |
| Max Hops | 3 | 4 | 2 |
| Gateway Links | 1 | 1 | 3 |
| Max Utilization | ~30% | ~41% | ~14.4% |
| Max E2E Delay | ~4,200 us | ~6,300 us | ~2,100 us |

---

## Sensor Specifications

All links are **1 Gbps (1000BASE-T1)** unless noted otherwise.

| Sensor | Model | Payload | Period | TX Time (1 hop) | Pkts/Cycle |
|--------|-------|---------|--------|-----------------|------------|
| Front Center LiDAR | AutoL G32 | 131,072 B (128 KB) | 10 ms | 1,048.9 us | 1 |
| Front Left LiDAR | Hesai Pandar 40P | 32,768 B (32 KB) | 10 ms | 262.4 us | 1 |
| Front Right LiDAR | Hesai Pandar 40P | 32,768 B (32 KB) | 10 ms | 262.4 us | 1 |
| Rear LiDAR | AutoL G32 | 131,072 B (128 KB) | 10 ms | 1,048.9 us | 1 |
| Front Radar | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 us | 2 |
| Corner Radars (x4) | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 us | 2 each |

TX time formula: `(payload_bytes + 38) * 8 / rate_mbps` where 38B = Ethernet overhead (Preamble 8 + MAC 14 + FCS 4 + IFG 12)

---

*Built with [D3.js](https://d3js.org/) and [GLPK](https://www.gnu.org/software/glpk/) (WebAssembly). All computation runs in the browser.*

---

# TSN/GCL ILP 스케줄러

브라우저 기반 IEEE 802.1Qbv TAS(Time-Aware Shaper) GCL 스케줄러. 정수 선형 프로그래밍(ILP)으로 **경로 선택 + 전송 시각**을 동시에 최적화합니다. GLPK/WASM으로 서버 없이 브라우저에서 실행됩니다.

## 페이지 구성

| 페이지 | 설명 |
|--------|------|
| `roii-real.html` | ROii 현실 센서 모델 — Standard / Reconf 토글, 802.1CB 리플리케이터 |
| `roii-stream.html` | ROii 스트리밍 센서 — Burst vs Streaming 모드 비교, 1.5ms 사이클 |
| `roii-grid.html` | ROii 균형 그리드 — 802.1CB FRER, REP 디바이스를 통한 부하 분산 |
| `roii-optimal.html` | ROii 최적 Tri-Star — 스위치→ACU 직결 3개, 모든 플로우 2홉 |
| `roii-hw.html` | ROii 실제 H/W 스펙 — Direct / 1G GW / 10G-T1 GW 3모드 비교 |
| `roii-learn.html` | ILP 학습 모드 — ILP 정형화 탐색, 파라미터 편집, 제약 조건 시각화 |
| `roii-ilp-viz.html` | 스케줄러 애니메이션 — Greedy 스케줄링 과정 단계별 시각화 |
| `roii-bb.html` | 분기한정법 시각화 — 커스텀 B&B solver, D3 트리 애니메이션 |
| `roii-custom.html` | **커스텀 플레이그라운드** — 토폴로지 자유 편집, JSON 입출력 |

## 커스텀 플레이그라운드 사용법

### 토폴로지 편집

- **노드 추가**: 빈 캔버스 롱프레스(600ms) 또는 `Ctrl+K` → "Add Node"
- **노드 삭제**: 우클릭 → Delete (연결된 링크/플로우도 삭제됨)
- **노드 이동**: 드래그
- **링크 추가**: 노드 롱프레스(500ms) → 타겟 노드로 드래그
- **링크 삭제**: 우클릭 → Delete

### 플로우 편집

- 좌측 사이드바에서 플로우 추가/선택/삭제
- 클릭 시 경로 하이라이트
- 편집 가능: 소스, 목적지, 페이로드, 주기, 데드라인, 우선순위, k_paths

### 파라미터 튜닝

`Ctrl+K` 커맨드 팔레트에서 슬라이더로 조정:
- Cycle Time (1,000 — 50,000 us)
- Guard Band (0 — 20 us)
- Processing Delay (0 — 20 us)

### 솔버

- **Greedy**: 즉시 (< 1ms), 페이지 로드 시 기본 실행
- **ILP**: GLPK WASM 로드 후 자동 실행 (기본 15초 제한)
- **Auto-Solve**: 토글 시 모델 변경마다 자동 재계산
- **솔루션 히스토리**: 최근 5개 결과 저장, 클릭으로 복원

### JSON 입출력

- **내보내기**: 전체 모델 JSON 다운로드 (`tsn-model-TIMESTAMP.json`)
- **가져오기**: 저장된 JSON 불러오기
- **프리셋**: Standard / Reconf / Optimal 즉시 로딩

## 실행

```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

## 핵심 기술

- **D3.js v7** — 토폴로지, GCL 간트 차트, 지연/이용률 시각화
- **Three.js r128** — 3D 셔틀 렌더링
- **GLPK/WASM** — GNU 선형 프로그래밍 (WebAssembly)
- **Web Audio API** — 애니메이션 페이지 사운드 효과
- **IEEE 802.1Qbv** — Time-Aware Shaper 표준
- 순수 ES 모듈, 빌드 불필요, 프레임워크 미사용
