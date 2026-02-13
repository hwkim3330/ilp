# TSN/GCL ILP Solver

Browser-based IEEE 802.1Qbv Time-Aware Shaper (TAS) Gate Control List scheduler using Integer Linear Programming. Jointly optimizes **route selection + transmission timing** with GLPK/WASM — no server required.

> **Live Demo**: [https://hwkim3330.github.io/ilp/](https://hwkim3330.github.io/ilp/)

## Pages

| Page | Topology | Nodes | Links | Flows | Key Feature |
|------|----------|------:|------:|------:|-------------|
| [ROii Realistic Sensor](roii-real.html) | Standard / Reconf toggle | 13–14 | 15–19 | 9–11 | 802.1CB replicator, link failover |
| [ROii Balanced Grid](roii-grid.html) | 802.1CB FRER | 14 | 18 | 11 | REP device, balanced load distribution |
| [ROii Optimal Tri-Star](roii-optimal.html) | 3× ACU direct links | 13 | 18 | 9 | All 2-hop, ~50% delay reduction |
| [ROii Hardware-Accurate](roii-hw.html) | Direct / 1G GW / 10G-T1 GW | 11–14 | 4–17 | 4–10 | Real H/W specs, mixed-speed links |

### ROii Realistic Sensor (`roii-real.html`)

2-mode toggle: **Standard** (13 nodes, 9 flows) vs **Reconfigured** (14 nodes + 802.1CB REP, 11 flows). Triangle backbone with link failure scenarios. Robosense G32 (128KB), Hesai Pandar 40P (32KB), Continental MRR-35 (4KB ×2 at 50Hz).

### ROii Balanced Grid (`roii-grid.html`)

IEEE 802.1CB Frame Replication and Elimination. REP device duplicates LIDAR_FC and RADAR_F frames to both SW_FL and SW_FR for balanced load. 14 nodes, 18 links, 11 flows.

### ROii Optimal Tri-Star (`roii-optimal.html`)

Each zone switch has a direct 1 Gbps link to ACU-IT. All flows are exactly 2 hops. Max E2E delay drops ~50% vs Standard. Triangle backbone used only for failover. 13 nodes, 18 links, 9 flows.

### ROii Hardware-Accurate (`roii-hw.html`)

Based on actual ROii sensor H/W specifications:

| Sensor | Count | Interface | Payload | Notes |
|--------|------:|-----------|---------|-------|
| LiDAR (Solid-state 135°) | 2 | 1000BASE-T1 | 128 KB | Front, Rear |
| LiDAR (Rotating 360°) | 2 | 1000BASE-T | 64 KB | Side-L, Side-R |
| Radar (MRR-35 class) | 6 | CAN-FD | 512 B | Front, Rear, 4 corners |
| Camera (SONY IMX031) | 6+ | V-by-One@HS | — | Excluded from TSN |

3-mode comparison:

- **Direct** — 4 LiDARs → ACU-IT (no switches, zero contention). Radars via CAN-FD direct.
- **1G Gateway** — 3 zone switches (LAN9692), all 1 Gbps. Gateway bottleneck ~31.7%.
- **10G-T1 Gateway** — Same topology, SW_REAR→ACU_IT upgraded to 10GBASE-T1. Bottleneck drops to ~3.2% (10× reduction).

## Quick Start

```bash
# Python HTTP server
python3 -m http.server 8080
# → http://localhost:8080
```

No build step, no npm, no framework. Just serve static files.

## Architecture

```
ilp/
├── index.html              Landing page (4 demo cards)
├── roii-real.html          Standard / Reconf topology
├── roii-grid.html          802.1CB FRER topology
├── roii-optimal.html       Tri-Star optimal topology
├── roii-hw.html            Hardware-accurate (3 modes)
├── style.css               Shared CSS (light theme)
├── js/
│   ├── ilp-core.js         Solver engine + D3 visualizations (60KB)
│   └── roii-real-data.js   All topology data models (58KB)
├── vendor/
│   ├── d3.min.js           D3 v7 (280KB)
│   ├── glpk.js             glpk.js browser build (250KB)
│   └── glpk.wasm           GLPK WASM binary (337KB)
├── roii.glb                3D shuttle model (3.5MB)
├── keti.png                KETI logo
└── server.js               Optional Node.js backend
```

## Solver

Two scheduling modes:

1. **Greedy** — Instant heuristic scheduler. Default on page load.
2. **ILP (GLPK/WASM)** — Optimal solver via GNU Linear Programming Kit. Auto-runs after WASM loads (tmlim=15s).

Key parameters per model:

- `cycle_time_us` — GCL hyper-period (10,000 µs = 10 ms for all ROii demos)
- `guard_band_us` — Guard band between gate events (3 µs)
- `k_paths` — Number of candidate routes per flow (BFS k-shortest paths)

## Visualizations

Each page includes:

1. **3D Shuttle View** — Three.js r128 with GLB model, orbit controls, auto-rotate
2. **Network Topology** — D3.js force-directed graph with fixed positions
3. **Per-Switch GCL** — Gate control entries with 8-queue gate mask blocks
4. **GCL Gantt Chart** — Per-link timeline with hatched guard bands, cross-flow hover highlight
5. **E2E Delay Chart** — Bar chart with deadline markers
6. **Link Utilization** — Horizontal bars per active link
7. **Packet Schedule Table** — Per-packet timing with status (OK/MISS)

## Link Failure Scenarios

All switched topologies support link failure simulation:

- Triangle backbone provides redundant paths
- BFS rerouting automatically finds alternate routes
- Failed links shown in red (2D + 3D)
- Re-solves GCL schedule after topology change

## Technologies

- **D3.js v7** — All 2D visualizations
- **Three.js r128** — 3D shuttle rendering
- **GLPK/WASM** — GNU Linear Programming Kit (WebAssembly)
- **IEEE 802.1Qbv** — Time-Aware Shaper standard
- Pure ES modules, no build step, no framework

---

# TSN/GCL ILP 스케줄러

브라우저 기반 IEEE 802.1Qbv TAS(Time-Aware Shaper) GCL 스케줄러. 정수 선형 프로그래밍(ILP)으로 **경로 선택 + 전송 시각**을 동시에 최적화합니다. GLPK/WASM으로 서버 없이 브라우저에서 실행됩니다.

## 페이지 구성

| 페이지 | 설명 |
|--------|------|
| `roii-real.html` | ROii 현실 센서 모델 — Standard / Reconf 토글, 802.1CB 리플리케이터 |
| `roii-grid.html` | ROii 균형 그리드 — 802.1CB FRER, REP 디바이스를 통한 부하 분산 |
| `roii-optimal.html` | ROii 최적 Tri-Star — 스위치→ACU 직결 3개, 모든 플로우 2홉 |
| `roii-hw.html` | ROii 실제 H/W 스펙 — Direct / 1G GW / 10G-T1 GW 3모드 비교 |

## 실행

```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

## ROii H/W 스펙 (roii-hw.html)

실제 ROii 자율주행 셔틀의 센서 H/W 사양 기반:

- **LiDAR 4개**: 이더넷 (1000BASE-T / T1) — TSN GCL 스케줄링 대상
- **Radar 6개**: CAN-FD — Direct 모드에서 ACU 직결, Switched 모드에서 CAN2ETH 브릿지
- **Camera 6+개**: V-by-One@HS — TSN 제외
- **ACU_IT**: Tiger Lake H 8C/16T, CAN-FD ×4, 1G-T, 1G-T1, **10G-T1**

3가지 모드 비교:

| 모드 | 게이트웨이 | 병목 이용률 | 최대 E2E |
|------|-----------|----------:|---------|
| Direct (스위치 없음) | — | 0% | ~1,049 µs |
| 1G Gateway | 1 Gbps | ~31.7% | ~3,150 µs |
| 10G-T1 Gateway | 10 Gbps | ~3.2% | ~2,200 µs |

## 핵심 기술

- **D3.js v7** — 토폴로지, GCL 간트 차트, 지연/이용률 시각화
- **Three.js r128** — 3D 셔틀 렌더링
- **GLPK/WASM** — GNU 선형 프로그래밍 (WebAssembly)
- **IEEE 802.1Qbv** — Time-Aware Shaper 표준
- 순수 ES 모듈, 빌드 불필요, 프레임워크 미사용
