# TSN/GCL ILP Solver

Browser-based IEEE 802.1Qbv Time-Aware Shaper (TAS) Gate Control List scheduler using Integer Linear Programming. Jointly optimizes **route selection + transmission timing** with GLPK/WASM — no server required.

> **Live Demo**: [https://hwkim3330.github.io/ilp/](https://hwkim3330.github.io/ilp/)

## Pages

| Page | Description |
|------|-------------|
| [`index.html`](index.html) | Landing page — links to solver and automotive demo |
| [`solver.html`](solver.html) | Generic solver — JSON editor with live input preview, 6 result visualizations |
| [`automotive.html`](automotive.html) | Automotive TSN demo — 11-node in-vehicle network, auto-solve on load |
| [`roii.html`](roii.html) | ROii Shuttle TSN demo — 13-node autonomous shuttle network (4 LiDAR + 5 Radar), auto-solve on load |

## Quick Start

```bash
# Option 1: Python HTTP server
cd /home/kim/ilp
python3 -m http.server 8080
# → http://localhost:8080

# Option 2: Node.js server (also provides /api/solve endpoint)
node server.js
# → http://localhost:8080
```

## Architecture

```
ilp/
├── index.html              ← Landing/hub page
├── solver.html             ← Generic solver (JSON input + preview)
├── automotive.html         ← Automotive TSN demo (auto-solve)
├── roii.html               ← ROii Shuttle TSN demo (auto-solve)
├── style.css               ← Shared CSS (dark theme)
├── js/
│   ├── ilp-core.js         ← Solver engine + D3 visualizations (ES module)
│   ├── automotive-data.js  ← Automotive scenario model + layout
│   └── roii-data.js        ← ROii shuttle scenario model + layout
├── vendor/
│   ├── d3.min.js           ← D3 v7 (~280KB)
│   ├── glpk.js             ← glpk.js@4 browser build (~250KB)
│   └── glpk.wasm           ← GLPK WASM binary (~337KB)
├── server.js               ← Optional Node.js backend
└── README.md
```

## Model Format (JSON)

```jsonc
{
  "cycle_time_us": 1000,          // GCL cycle time (microseconds)
  "guard_band_us": 2,             // Guard band duration
  "processing_delay_us": 2,       // Switch processing delay
  "nodes": [
    { "id": "s1", "type": "switch" },
    { "id": "esA", "type": "endstation" }
  ],
  "links": [
    { "id": "l_s1_s2", "from": "s1", "to": "s2", "rate_mbps": 1000, "prop_delay_us": 0.8 }
  ],
  "flows": [
    {
      "id": "f_ctrl",
      "priority": 7,               // 0-7 (TSN: >=6)
      "payload_bytes": 280,
      "period_us": 250,
      "deadline_us": 130,           // null = best-effort
      "traffic_type": "control",
      "src": "esA", "dst": "esB",  // Auto k-path routing
      "k_paths": 3
      // OR: "candidate_paths": [["l_esA_s1", "l_s1_s2", ...]]
    }
  ]
}
```

## Visualizations

1. **Network Topology** — Force-directed graph with animated flow paths
2. **GCL Gantt Chart** — Per-link gate schedule timeline
3. **E2E Delay Chart** — Bar chart with deadline markers
4. **Link Utilization** — Donut charts per active link
5. **Packet Schedule Table** — Detailed per-packet timing
6. **Input Preview** (solver.html) — Live BFS topology from raw JSON

## Technologies

- **D3.js v7** — All visualizations
- **GLPK/WASM** — GNU Linear Programming Kit (WebAssembly)
- **IEEE 802.1Qbv** — Time-Aware Shaper standard
- Pure ES modules, no build step, no framework

---

# TSN/GCL ILP 스케줄러 (한국어)

브라우저 기반 IEEE 802.1Qbv TAS(Time-Aware Shaper) GCL 스케줄러입니다. 정수 선형 프로그래밍(ILP)으로 **경로 선택 + 전송 시각**을 동시에 최적화합니다. GLPK/WASM으로 서버 없이 브라우저에서 실행됩니다.

## 페이지 구성

| 페이지 | 설명 |
|--------|------|
| `index.html` | 랜딩 페이지 — 솔버/자동차 데모 링크 |
| `solver.html` | 범용 솔버 — JSON 편집기 + 실시간 입력 미리보기, 6가지 결과 시각화 |
| `automotive.html` | 자동차 TSN 데모 — 11노드 차량 내 네트워크, 자동 풀이 |
| `roii.html` | ROii 셔틀 TSN 데모 — 13노드 자율주행 셔틀 네트워크 (LiDAR 4개 + Radar 5개), 자동 풀이 |

## 실행

```bash
cd /home/kim/ilp
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

## 모델 형식

- `cycle_time_us`: GCL 사이클 시간 (마이크로초)
- `nodes[]`: `{ id, type }` — switch 또는 endstation
- `links[]`: `{ id, from, to, rate_mbps, prop_delay_us }`
- `flows[]`: 수동경로(`candidate_paths[][]`) 또는 자동경로(`src, dst, k_paths`)

## 핵심 기술

- **D3.js v7** — 토폴로지, 간트 차트, 지연 차트, 이용률 시각화
- **GLPK/WASM** — GNU 선형 프로그래밍 (WebAssembly)
- **IEEE 802.1Qbv** — Time-Aware Shaper 표준
- 순수 ES 모듈, 빌드 불필요, 프레임워크 미사용
