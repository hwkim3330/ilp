# TSN GCL 스케줄링 토폴로지 분석 보고서

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [센서 사양](#2-센서-사양)
3. [토폴로지 비교](#3-토폴로지-비교) — Standard, Reconf, Tri-Star, H/W Direct/1G/10G, Streaming
4. [802.1CB 프레임 복제의 문제점](#4-8021cb-프레임-복제의-문제점)
5. [ILP 정형화](#5-ilp-정형화)
6. [스케줄링 결과 분석](#6-스케줄링-결과-분석)
7. [링크 장애 시나리오](#7-링크-장애-시나리오)
8. [결론](#8-결론)
9. [Interactive 도구](#9-interactive-도구) — Learning, Animation, B&B, Custom Playground

---

## 1. 프로젝트 개요

IEEE 802.1Qbv Time-Aware Shaper(TAS)의 Gate Control List(GCL) 스케줄링을
브라우저에서 최적화하는 도구이다. GLPK WASM 기반 ILP(Integer Linear Programming)
solver와 Greedy 휴리스틱을 함께 사용한다.

| 구성 요소 | 기술 |
|-----------|------|
| ILP Solver | GLPK 5.0 (WebAssembly) |
| 시각화 | D3.js (2D 토폴로지 + Gantt) |
| 3D 뷰 | Three.js + GLB 모델 |
| 데이터 | JavaScript ES Module |

### 페이지 구성

#### 토폴로지 데모 (5개)

| 페이지 | 토폴로지 | 노드 | 링크 | 플로우 | 특징 |
|--------|----------|------|------|--------|------|
| `roii-real.html` | Standard / Reconf 전환 | 13 / 14 | 17 / 18 | 9 / 11 | 2모드 토글, 링크 장애 |
| `roii-stream.html` | Burst vs Streaming 비교 | 13 | 17 | 9 | 1.5ms 사이클, 45 pkts |
| `roii-grid.html` | Balanced Grid (802.1CB) | 14 | 18 | 11 | REP 디바이스, 부하 분산 |
| `roii-optimal.html` | Tri-Star (3× ACU 직결) | 13 | 18 | 9 | 2홉, ~50% 딜레이 감소 |
| `roii-hw.html` | Direct / 1G GW / 10G-T1 GW | 11–14 | 4–17 | 4–10 | 실제 H/W 스펙, 혼합 속도 |

#### Interactive 도구 (4개)

| 페이지 | 용도 | 특징 |
|--------|------|------|
| `roii-learn.html` | ILP 정형화 학습 | 파라미터 편집, 제약 시각화, 변수 분해 |
| `roii-ilp-viz.html` | 스케줄러 애니메이션 | Greedy 단계별 배치, Web Audio, 다크 테마 |
| `roii-bb.html` | 분기한정법 시각화 | D3 트리, 분기/바운딩/가지치기 실시간 |
| `roii-custom.html` | 커스텀 플레이그라운드 | 토폴로지 자유 편집, JSON 입출력, Auto-Solve |

---

## 2. 센서 사양

모든 링크는 **1 Gbps (1000BASE-T1)** 이다.

| 센서 | 모델 | 페이로드 | 주기 | Tx 시간 (1홉) | 패킷/사이클 |
|------|------|----------|------|---------------|-------------|
| Front Center LiDAR | AutoL G32 | 131,072 B (128 KB) | 10 ms (100 Hz) | 1,048.9 µs | 1 |
| Front Left LiDAR | Hesai Pandar 40P | 32,768 B (32 KB) | 10 ms (100 Hz) | 262.4 µs | 1 |
| Front Right LiDAR | Hesai Pandar 40P | 32,768 B (32 KB) | 10 ms (100 Hz) | 262.4 µs | 1 |
| Rear LiDAR | AutoL G32 | 131,072 B (128 KB) | 10 ms (100 Hz) | 1,048.9 µs | 1 |
| Front Radar | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 µs | 2 |
| Front-Left Corner | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 µs | 2 |
| Front-Right Corner | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 µs | 2 |
| Rear-Left Corner | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 µs | 2 |
| Rear-Right Corner | Continental MRR-35 | 4,096 B (4 KB) | 5 ms (50 Hz) | 33.1 µs | 2 |

**전송 시간 계산:**

```
tx_us = (payload_bytes + 38) × 8 / rate_mbps
      = (payload_bytes + 38) × 8 / 1000

예: G32 = (131072 + 38) × 8 / 1000 = 1,048.88 µs
    Pandar = (32768 + 38) × 8 / 1000 = 262.45 µs
    MRR-35 = (4096 + 38) × 8 / 1000 = 33.07 µs
```

38바이트 = Ethernet overhead (Preamble 8 + MAC header 14 + FCS 4 + IFG 12)

**사이클 내 패킷 수:**

```
reps = cycle_time_us / period_us

LiDAR: 10000 / 10000 = 1 패킷/사이클
Radar:  10000 / 5000  = 2 패킷/사이클
```

---

## 3. 토폴로지 비교

### 3.1 Standard (13노드, 17링크, 9플로우)

```
LIDAR_FC ──→ SW_FL ──→ SW_REAR ──→ ACU_IT
LIDAR_FL ──→ SW_FL ──↗
RADAR_FLC ──→ SW_FL ──↗
                       ↕
LIDAR_FR ──→ SW_FR ──→ SW_REAR ──→ ACU_IT
RADAR_F ──→  SW_FR ──↗
RADAR_FRC ──→ SW_FR ──↗
                       ↕
LIDAR_R ──→ SW_REAR ──→ ACU_IT
RADAR_RLC ──→ SW_REAR ──↗
RADAR_RRC ──→ SW_REAR ──↗
```

**구조적 특징:**
- 모든 트래픽이 **SW_REAR → ACU_IT** 단일 링크를 통과
- 전방 센서는 **3홉** (센서 → 전방 스위치 → SW_REAR → ACU_IT)
- 후방 센서는 **2홉** (센서 → SW_REAR → ACU_IT)
- 삼각형 백본 (SW_FL ↔ SW_FR ↔ SW_REAR)으로 장애 시 우회 가능

**병목:**
- SW_REAR → ACU_IT 링크에 **14패킷 집중** → 활용률 ~30%

---

### 3.2 Reconfigured (14노드, 18링크, 11플로우)

```
                    ┌──→ SW_FL ──→ SW_REAR ──→ ACU_IT
LIDAR_FC ──→ REP ──┤
                    └──→ SW_FR ──→ SW_REAR ──→ ACU_IT

                    ┌──→ SW_FL ──→ SW_REAR ──→ ACU_IT
RADAR_F ──→  REP ──┤
                    └──→ SW_FR ──→ SW_REAR ──→ ACU_IT

(나머지 7개 플로우는 Standard와 동일)
```

**구조적 특징:**
- IEEE 802.1CB FRER (Frame Replication and Elimination for Reliability)
- REP(Replicator) 노드가 LIDAR_FC와 RADAR_F를 **양쪽 경로로 복제**
- 수신측(ACU_IT)에서 중복 제거 → 한쪽 경로 장애 시에도 수신 보장
- 총 11플로우 = 원본 9 + 복제본 2 (f_lidar_fc_rep, f_radar_f_rep)

**병목:**
- SW_REAR → ACU_IT 링크에 **17패킷 집중** → 활용률 ~41%
- 복제로 인해 대역폭 소비 증가 (+ 3패킷/사이클)

---

### 3.3 Optimal Tri-Star (13노드, 18링크, 9플로우)

```
LIDAR_FC ──→ SW_FL ──→ ACU_IT     (직접 연결!)
LIDAR_FL ──→ SW_FL ──→ ACU_IT
RADAR_FLC ──→ SW_FL ──→ ACU_IT

LIDAR_FR ──→ SW_FR ──→ ACU_IT     (직접 연결!)
RADAR_F ──→  SW_FR ──→ ACU_IT
RADAR_FRC ──→ SW_FR ──→ ACU_IT

LIDAR_R ──→ SW_REAR ──→ ACU_IT    (직접 연결!)
RADAR_RLC ──→ SW_REAR ──→ ACU_IT
RADAR_RRC ──→ SW_REAR ──→ ACU_IT

(삼각형 백본: SW_FL ↔ SW_FR ↔ SW_REAR — 장애 시 우회 전용)
```

**구조적 특징:**
- 각 스위치가 ACU_IT에 **직접 1 Gbps 링크** 보유
- **모든 플로우가 2홉** (센서 → 존 스위치 → ACU_IT)
- 삼각형 백본은 정상 시 미사용, 장애 시에만 우회 경로
- 복제 불필요 — 경로 다양성은 토폴로지 자체가 제공

**장점:**
- 병목 분산: 최대 활용률 **~14.4%** (vs Standard 30%, Reconf 41%)
- 최대 E2E 딜레이 **~50% 감소** (2,100 µs vs 4,200 µs)
- 단순한 구조 — 복제/제거 로직 불필요

---

### 3.4 정량 비교

| 지표 | Standard | Reconf (802.1CB) | Optimal Tri-Star |
|------|----------|------------------|------------------|
| 노드 수 | 13 | 14 (+REP) | 13 |
| 링크 수 | 17 | 18 | 18 |
| 플로우 수 | 9 | 11 (+2 복제) | 9 |
| 패킷/사이클 | 14 | 17 (+3 복제) | 14 |
| 최대 홉 수 | 3 | 4 (센서→REP→스위치→SW_REAR→ACU) | 2 |
| 게이트웨이 링크 | 1 (SW_REAR→ACU) | 1 (SW_REAR→ACU) | 3 (각 스위치→ACU) |
| 게이트웨이 활용률 | ~30% | ~41% | ~14.4% |
| 최대 E2E 딜레이 | ~4,200 µs | ~6,300 µs | ~2,100 µs |
| ILP 데드라인 | 5,000 µs | 8,000 µs (완화 필요) | 5,000 µs |
| ILP 소요 시간 | ~12 s | ~15 s | ~12 s |
| 장애 복원 | 삼각형 우회 | 복제 + 삼각형 | 삼각형 우회 |

---

### 3.5 Hardware-Accurate (roii-hw.html)

실제 ROii 자율주행 셔틀의 센서 H/W 사양 기반 3가지 네트워크 구성을 비교한다.

**센서 H/W 사양:**

| 센서 | 개수 | 인터페이스 | 페이로드 | 비고 |
|------|-----:|-----------|---------|------|
| LiDAR (Solid-state 135°) | 2 | 1000BASE-T1 | 128 KB | 전방, 후방 |
| LiDAR (Rotating 360°) | 2 | 1000BASE-T | 64 KB | 좌측, 우측 |
| Radar (MRR-35 class) | 6 | CAN-FD | 512 B | 전방, 후방, 4코너 |
| Camera (SONY IMX031) | 6+ | V-by-One@HS | — | TSN 제외 |

**3가지 모드 비교:**

#### Direct (스위치 없음)

```
LIDAR_FC ──→ ACU_IT     (1:1 이더넷 직결)
LIDAR_FL ──→ ACU_IT
LIDAR_FR ──→ ACU_IT
LIDAR_R  ──→ ACU_IT
RADAR_*  ──→ ACU_IT     (CAN-FD 직결, 별도 채널)
```

- 노드 11, 링크 4 (이더넷만), 플로우 4
- **제로 경쟁** — 각 LiDAR가 전용 1 Gbps 링크 보유
- 최소 지연, 최대 케이블 수

#### 1G Gateway (1 Gbps 게이트웨이)

```
LIDAR_FC ──→ SW_FL ──→ SW_REAR ──→ ACU_IT   (all 1 Gbps)
LIDAR_FL ──→ SW_FL ──↗
RADAR_*  ──→ SW_*  ──→ SW_REAR ──→ ACU_IT
```

- 노드 14, 링크 17, 플로우 10
- 병목: SW_REAR → ACU_IT @ 1 Gbps → **활용률 ~31.7%**
- 구조적으로 Standard 토폴로지와 동일하지만 Radar도 이더넷(CAN2ETH 브릿지)

#### 10G-T1 Gateway (10 Gbps 업링크)

```
(동일 토폴로지, SW_REAR → ACU_IT만 10 Gbps로 업그레이드)
```

- 병목 활용률: **~3.2%** (10× 감소)
- E2E 딜레이 ~30% 감소
- 혼합 속도 네트워크: 센서 링크 1G, 업링크 10G

**정량 비교:**

| 지표 | Direct | 1G Gateway | 10G-T1 Gateway |
|------|--------|-----------|----------------|
| 노드 수 | 11 | 14 | 14 |
| 링크 수 | 4 | 17 | 17 |
| 플로우 수 | 4 | 10 | 10 |
| 게이트웨이 병목 | 없음 | ~31.7% | ~3.2% |
| 최대 E2E | ~1,049 µs | ~3,150 µs | ~2,200 µs |
| 케이블 비용 | 최대 | 중간 | 중간 + 10G 포트 |

**결론:** 10G-T1 업링크 하나로 병목을 10분의 1로 줄일 수 있어, Tri-Star(케이블 3개 추가)과 함께 가장 실용적인 해결책이다.

---

### 3.6 Streaming 모델 (roii-stream.html)

기존 Burst 모드와 Streaming 모드를 비교하는 페이지이다.

**Burst 모드 (기존):**
- 센서가 주기마다 전체 데이터를 하나의 대형 프레임으로 전송
- G32 LiDAR: 128 KB를 한 번에 → 1,048.9 µs/홉 점유
- 장점: 단순, 적은 GCL 엔트리
- 단점: 대형 프레임이 링크를 오래 점유 → 다른 플로우 큐잉 지연

**Streaming 모드:**
- 센서가 데이터를 작은 UDP 패킷으로 분할하여 연속 전송
- G32 LiDAR: 1,200 B × 매 100 µs
- Pandar 40P: 매 300 µs
- MRR-35 CAN2ETH: 매 1,500 µs
- **사이클 = 1.5 ms (1,500 µs)**, 45 pkts/cycle

**비교:**

| 지표 | Burst (10 ms) | Streaming (1.5 ms) |
|------|--------------|-------------------|
| 사이클 | 10,000 µs | 1,500 µs |
| 패킷/사이클 | 14 | 45 |
| 최대 패킷 크기 | 128 KB | 1,200 B |
| 최대 1홉 TX | 1,048.9 µs | 9.9 µs |
| 링크 점유 패턴 | 긴 점유 + 긴 빈 시간 | 짧은 점유 반복 |
| GCL 엔트리 수 | 적음 | 많음 |
| 최대 큐잉 지연 | 높음 | 낮음 |

**핵심 인사이트:** 스트리밍은 패킷 수는 많지만 각 패킷의 링크 점유 시간이
짧아 **우선순위 역전(priority inversion)** 위험이 크게 줄어든다.
Burst 모드에서 128 KB 프레임이 1,049 µs 동안 링크를 독점하는 반면,
Streaming의 1.2 KB 프레임은 ~10 µs만 점유하므로 다른 플로우의 지연 영향이 최소화된다.

---

### 3.7 전체 토폴로지 비교 (5개 모드)

| 지표 | Standard | Reconf | Tri-Star | 1G GW | 10G-T1 GW |
|------|----------|--------|----------|-------|-----------|
| 병목 활용률 | ~30% | ~41% | ~14.4% | ~31.7% | ~3.2% |
| 최대 E2E | ~4,200 µs | ~6,300 µs | ~2,100 µs | ~3,150 µs | ~2,200 µs |
| 최대 홉 수 | 3 | 4 | 2 | 3 | 3 |
| 추가 비용 | — | REP 장비 | +3 케이블 | — | 10G 포트 |
| 확장성 | 보통 | 나쁨 | 좋음 | 보통 | 좋음 |

---

## 4. 802.1CB 프레임 복제의 문제점

### 4.1 핵심 문제: 공유 링크 병목

802.1CB 복제의 근본적 문제는 **원본과 복제본이 공유 링크에서 직렬화**된다는 점이다.

**LIDAR_FC 복제 시나리오:**

```
           l_lidarfc_rep          l_rep_swfl          l_swfl_rear        l_swrear_acu
LIDAR_FC ──────────────→ REP ──────────────→ SW_FL ──────────────→ SW_REAR ──────────→ ACU_IT
                                    │
                                    │         l_rep_swfr          l_swfr_rear        l_swrear_acu
                                    └────────────────→ SW_FR ──────────────→ SW_REAR ──────────→ ACU_IT
```

**문제 1: 입력 링크(l_lidarfc_rep) 공유**

G32 LiDAR의 전송 시간은 **1,048.9 µs/홉**이다.

```
원본 (f_lidar_fc):
  LIDAR_FC → REP: 1,048.9 µs (l_lidarfc_rep 점유)
  REP → SW_FL:    1,048.9 µs
  SW_FL → SW_REAR: 1,048.9 µs
  SW_REAR → ACU_IT: 1,048.9 µs
  최소 E2E = 1,048.9 × 4 + 전파지연 + 처리지연 ≈ 4,210 µs

복제본 (f_lidar_fc_rep):
  LIDAR_FC → REP: 대기 1,048.9 µs + 전송 1,048.9 µs (l_lidarfc_rep 직렬화!)
  REP → SW_FR:    1,048.9 µs
  SW_FR → SW_REAR: 1,048.9 µs
  SW_REAR → ACU_IT: 1,048.9 µs
  최소 E2E = 1,048.9 + 1,048.9 × 4 + 지연 ≈ 5,260 µs
```

복제본은 원본이 `l_lidarfc_rep` 링크를 점유하는 동안 **대기**해야 하므로,
최소 E2E가 원본보다 **~1,050 µs** 더 길다.

**문제 2: 출력 링크(SW_REAR→ACU_IT) 집중**

원본과 복제본 **모두** 최종적으로 SW_REAR → ACU_IT 링크를 통과한다:

```
SW_REAR → ACU_IT 링크 통과 패킷:
  Standard: 14 패킷 → 활용률 ~30%
  Reconf:   17 패킷 → 활용률 ~41%
  증가분:    +3 패킷 (복제본 LiDAR 1 + Radar 2)
```

### 4.2 ILP 실행 불가능(Infeasibility) 문제

**증상:** Greedy 스케줄러는 정상 작동하지만, ILP solver가 "Infeasible" 반환.

**원인:** ILP는 데드라인을 **하드 제약(hard constraint)** 으로 처리한다:

```
제약: s_{p,last} + tx_last + pd_last ≤ deadline
```

G32 LiDAR 복제본의 최소 E2E가 ~5,260 µs인데, 데드라인이 5,000 µs로 설정되어
있으면 **수학적으로 충족이 불가능**하다.

반면 Greedy 스케줄러는 데드라인을 **소프트 제약**으로 처리하여, 위반 시
"MISS" 표시만 하고 스케줄링 자체는 진행한다.

**해결:** 복제된 G32 LiDAR 플로우의 데드라인을 5,000 → **8,000 µs**로 완화.

```javascript
// f_lidar_fc와 f_lidar_fc_rep 모두
deadline_us: 8000  // 5000에서 완화
```

### 4.3 대역폭 중복 소비

802.1CB는 **동일 데이터를 2배 전송**한다. 이는 대역폭 관점에서 비효율적이다:

```
G32 LiDAR 128KB 복제:
  원본 경로:  4홉 × 1,048.9 µs = 4,196 µs 링크 점유
  복제 경로:  4홉 × 1,048.9 µs = 4,196 µs 링크 점유
  총 링크 점유: 8,392 µs (원본 대비 2배)

MRR-35 Radar 4KB 복제:
  원본 경로:  4홉 × 33.1 µs = 132 µs
  복제 경로:  4홉 × 33.1 µs = 132 µs
  총 링크 점유: 264 µs × 2패킷/사이클 = 528 µs
```

### 4.4 복잡성 증가

| 측면 | Standard | 802.1CB Reconf |
|------|----------|----------------|
| 노드 수 | 13 | 14 (+REP 장비 비용) |
| 플로우 관리 | 9 | 11 (복제 플로우 추가 설정) |
| 수신측 로직 | 없음 | 중복 제거(Elimination) 필요 |
| 시퀀스 번호 | 없음 | R-TAG 또는 HSR/PRP 시퀀스 관리 |
| 데드라인 제약 | 5,000 µs | 8,000 µs (완화 필요) |
| GCL 엔트리 | 적음 | 더 많음 (추가 패킷 스케줄링) |

### 4.5 복제가 적합한 경우 vs 부적합한 경우

**적합한 경우:**
- 소형 패킷 (예: CAN 메시지, 8~64 바이트) → 직렬화 지연 무시 가능
- 데드라인 여유가 충분할 때 (E2E << 데드라인)
- 경로 다양성이 토폴로지로 확보 불가능할 때
- 안전 필수(Safety-Critical) 트래픽으로 반드시 이중화가 필요할 때

**부적합한 경우 (현 시나리오):**
- **대형 패킷** (128KB LiDAR) → 직렬화에 ~1,049 µs 소요
- 공유 링크 존재 → 직렬화 대기로 E2E 급증
- 모든 트래픽이 단일 게이트웨이 링크 통과 → 병목 심화
- 데드라인이 엄격할 때 → ILP 실행 불가능

---

## 5. ILP 정형화

### 5.1 패킷 확장 (Packet Expansion)

각 플로우를 사이클 내 개별 패킷으로 확장한다:

```
패킷 p = {
  pid:    "flow_id#k"                    (예: "f_lidar_fc#0")
  fid:    플로우 ID
  pri:    우선순위 (7=LiDAR, 6=Radar)
  rel:    해제 시간 = k × period_us      (k번째 인스턴스)
  dl:     절대 데드라인 = rel + deadline_us
  routes: [{                              (k_paths개 후보 경로)
    ri: 경로 인덱스,
    hops: [{ lid, tx, pd }]              (링크 ID, 전송시간, 전파지연)
  }]
}
```

### 5.2 경로 탐색 (BFS k-Shortest Paths)

DFS + 백트래킹으로 k개 최단 경로를 탐색한다:

```
generateKPaths(adj, src, dst, k):
  1. DFS로 src → dst 모든 경로 탐색 (방문 집합으로 루프 방지)
  2. 홉 수 기준 정렬 → 사전순 정렬
  3. 중복 제거 후 상위 k개 반환
```

현재 설정: **k_paths = 2** (모든 플로우)

### 5.3 Fixed-Route ILP (단일 경로)

모든 패킷이 1개 경로만 가질 때 사용되는 축소 정형화:

**변수:**
- `s_{p,h}` ∈ ℝ⁺ : 패킷 p의 h번째 홉 시작 시간

**목적함수:**
```
min Σ s_{p,last}    (TSN 패킷의 마지막 홉 시작 시간 합)
```

**제약:**
```
1. 홉 체인:     s_{p,h+1} ≥ s_{p,h} + tx_h + pd_h + proc_delay
2. 해제 시간:   s_{p,0} ≥ rel_p
3. 데드라인:    s_{p,last} + tx_last + pd_last ≤ dl_p
4. 비중첩:      같은 링크에 배정된 패킷 쌍 (a,b)에 대해:
                s_b ≥ s_a + blk_a - M × y_{a,b}     (y=0: a 먼저)
                s_a ≥ s_b + blk_b - M × (1-y_{a,b}) (y=1: b 먼저)
                여기서 blk = tx + guard_band (TSN일 때)
```

**최적화 기법:**
- **Tight M**: M = 전역 cycle_time이 아니라, 패킷 쌍별 실행 윈도우 기반 최소 M
- **윈도우 가지치기**: 실행 윈도우가 겹치지 않는 쌍은 비중첩 제약 생략
- **타이트 바운드**: 각 홉별 lb/ub를 해제시간/데드라인에서 유도

### 5.4 Multi-Route ILP (다중 경로)

k_paths > 1일 때, 경로 선택까지 최적화:

**추가 변수:**
- `z_{p,r}` ∈ {0,1} : 패킷 p가 경로 r을 선택 (이진 변수)
- `s_{p,r,h}` ∈ ℝ⁺ : 패킷 p, 경로 r의 h번째 홉 시작 시간

**추가 제약:**
```
5. 경로 선택:   Σ_r z_{p,r} = 1              (정확히 1개 경로)
6. Big-M 활성화: s_{p,r,h} ≥ rel_p - M(1 - z_{p,r})
                 s_{p,r,last} ≤ dl_p + M(1 - z_{p,r})
7. 경로간 비중첩: z 변수 결합으로 같은 링크 사용 시에만 제약 활성
```

**복잡도:**

| 지표 | Fixed-Route | Multi-Route (k=2) |
|------|-------------|-------------------|
| 연속 변수 | ~85 | ~309 |
| 이진 변수 | ~50 | ~229 |
| 해결 시간 | ~12 s | ~15 s (feasible) |
| 해 품질 | Optimal | Feasible (시간 내 최적 미도달) |

### 5.5 Greedy vs ILP

| 특성 | Greedy | ILP |
|------|--------|-----|
| 알고리즘 | 우선순위 기반 리스트 스케줄링 | 분기한정법 (Branch & Bound) |
| 실행 시간 | < 1 ms | 2~15 s |
| 데드라인 처리 | 소프트 (MISS 표시) | 하드 (실행 불가능 시 실패) |
| 최적성 | 휴리스틱 (최적 아닐 수 있음) | 최적 또는 Feasible 해 보장 |
| 경로 선택 | 최단 경로 우선 | 전체 탐색 공간 최적화 |
| 의존성 | 없음 (순수 JS) | GLPK WASM (~500KB) |
| 사용 시점 | 즉시 (페이지 로드) | GLPK 로드 후 자동 실행 |

---

## 6. 스케줄링 결과 분석

### 6.1 GCL(Gate Control List) 구조

각 링크에 대해 시간 슬롯별 게이트 마스크를 생성한다:

```
게이트 마스크: 8비트 (큐 0~7)
  Priority 7 (LiDAR):  10000000  → 큐 7만 개방
  Priority 6 (Radar):  01000000  → 큐 6만 개방
  BE (Best Effort):     00000001  → 큐 0만 개방

GCL 엔트리 = {
  gate_mask:    "10000000"
  start_us:     시작 시간
  end_us:       종료 시간 (= start + tx_time)
  duration_us:  지속 시간
}

가드 밴드 (TSN 플로우):
  전송 종료 후 3 µs 추가 → 게이트 전환 보호
```

### 6.2 토폴로지별 예상 성능

#### Standard

```
최대 딜레이 경로: LIDAR_FC → SW_FL → SW_REAR → ACU_IT (3홉)
  홉 1: 1,048.9 µs (tx) + 0.5 µs (pd) + 3 µs (proc)
  홉 2: 1,048.9 µs + 0.5 µs + 3 µs
  홉 3: 1,048.9 µs + 0.3 µs
  이론적 최소 E2E ≈ 3,155 µs
  실제 (큐잉 포함) ≈ 4,200 µs

SW_REAR → ACU_IT 활용률:
  LiDAR: (1,048.9 + 1,048.9 + 262.4 + 262.4) × 1 = 2,622.6 µs
  Radar: 33.1 × 10 (5개 × 2패킷) = 331 µs
  가드밴드: 3 × 14 = 42 µs
  합계: 2,996 µs / 10,000 µs = ~30%
```

#### Optimal Tri-Star

```
모든 플로우 최대 경로: 센서 → 스위치 → ACU_IT (2홉)
  G32: 1,048.9 + 0.5 + 3 + 1,048.9 + 0.3 = 2,101.6 µs
  Pandar: 262.4 + 0.5 + 3 + 262.4 + 0.3 = 528.6 µs
  MRR-35: 33.1 + 0.5 + 3 + 33.1 + 0.3 = 70 µs

각 게이트웨이 링크 활용률 (SW_FL → ACU_IT 예시):
  LIDAR_FC (G32): 1,048.9 × 1 = 1,048.9 µs
  LIDAR_FL (Pandar): 262.4 × 1 = 262.4 µs
  RADAR_FLC: 33.1 × 2 = 66.2 µs
  가드밴드: 3 × 4 = 12 µs
  합계: 1,389.5 µs / 10,000 µs = ~14%
```

---

## 7. 링크 장애 시나리오

### 7.1 장애 복원 메커니즘

장애 시 BFS가 삼각형 백본을 통해 **자동으로 대체 경로를 탐색**한다:

```javascript
// 장애 링크 제거 후 재스케줄링
m.links = m.links.filter(l => !failSet.has(l.id));
// 하드코딩 경로가 끊어지면 삭제 → BFS가 새 경로 생성
m.flows.forEach(f => {
  if (f.path && !f.path.every(lid => linkIds.has(lid))) delete f.path;
});
```

### 7.2 페이지별 장애 시나리오

#### roii-real.html (Standard)

| 시나리오 | 끊어진 링크 | 영향 | 우회 경로 |
|----------|-------------|------|-----------|
| SW_FL→REAR ✕ | l_swfl_rear | FL 센서 3개 | SW_FL → SW_FR → SW_REAR → ACU |
| SW_FR→REAR ✕ | l_swfr_rear | FR 센서 3개 | SW_FR → SW_FL → SW_REAR → ACU |
| FL↔FR ✕ | l_swfl_swfr | 직접 교차 불가 | 각각 SW_REAR 경유 (이미 정상 경로) |

#### roii-grid.html (Reconf)

| 시나리오 | 끊어진 링크 | 영향 | 우회 경로 |
|----------|-------------|------|-----------|
| REP→SW_FL ✕ | l_rep_swfl | FL 복제본 | REP → SW_FR 경유 (복제본 생존) |
| REP→SW_FR ✕ | l_rep_swfr | FR 복제본 | REP → SW_FL 경유 (복제본 생존) |
| SW_FL→REAR ✕ | l_swfl_rear | FL 센서 | SW_FL → SW_FR → SW_REAR → ACU |

#### roii-optimal.html (Tri-Star)

| 시나리오 | 끊어진 링크 | 영향 | 우회 경로 |
|----------|-------------|------|-----------|
| SW_FL→ACU ✕ | l_swfl_acu | FL 센서 3개 | SW_FL → SW_FR → ACU 또는 SW_FL → SW_REAR → ACU |
| SW_FR→ACU ✕ | l_swfr_acu | FR 센서 3개 | SW_FR → SW_FL → ACU 또는 SW_FR → SW_REAR → ACU |
| SW_REAR→ACU ✕ | l_swrear_acu | REAR 센서 3개 | SW_REAR → SW_FL → ACU 또는 SW_REAR → SW_FR → ACU |

**Tri-Star 장점:** 장애 시에도 **최대 3홉** (Standard의 정상 시와 동일).
Standard에서 장애 시 **최대 4홉**까지 증가.

---

## 8. 결론

### 8.1 802.1CB 복제가 문제가 되는 이유 (요약)

1. **공유 링크 직렬화**: 대형 패킷(128KB)의 원본+복제가 동일 입력 링크를 순차 점유 → E2E +1,050 µs
2. **단일 게이트웨이 병목 심화**: 복제 트래픽까지 SW_REAR→ACU_IT에 집중 → 활용률 30%→41%
3. **ILP 실행 불가능**: 직렬화 대기로 최소 E2E가 데드라인 초과 → 하드 제약 위반
4. **대역폭 2배 소비**: 동일 데이터가 2경로로 전송 → 링크 자원 낭비
5. **추가 장비/복잡성**: REP 노드, R-TAG 시퀀스 번호, 수신측 중복 제거 로직 필요

### 8.2 Optimal Tri-Star이 더 나은 이유

| | 802.1CB 복제 | Tri-Star 직접 연결 |
|---|---|---|
| 신뢰성 확보 방식 | 프레임 복제 (데이터 중복) | 토폴로지 다중 경로 (물리적 이중화) |
| 추가 장비 | REP 노드 필요 | 케이블 3개 추가 |
| 대역폭 효율 | 2배 소비 | 1배 (중복 없음) |
| 최대 E2E | ~6,300 µs | ~2,100 µs |
| 최대 활용률 | ~41% | ~14.4% |
| ILP 호환 | 데드라인 완화 필요 | 원래 데드라인 충족 |
| 확장성 | 플로우 추가 시 병목 악화 | 3개 링크로 부하 분산 |

### 8.3 권장 사항

1. **대형 패킷 센서 네트워크**: Tri-Star 토폴로지 채택 (직접 링크가 복제보다 효율적)
2. **소형 패킷 안전 필수 메시지**: 802.1CB 복제 유효 (직렬화 오버헤드 무시 가능)
3. **하이브리드 접근**: Tri-Star 토폴로지 + 소형 안전 메시지만 선택적 802.1CB 복제

---

---

## 9. Interactive 도구

### 9.1 ILP Learning Mode (`roii-learn.html`)

ILP 정형화를 이해하기 위한 대화형 학습 도구이다.

**기능:**
- 플로우별 페이로드, 주기, 데드라인 실시간 편집
- 변수 개수 분해: 연속 변수 / 이진 변수 / 제약 조건 수 계산
- Big-M 값 계산 예시 (전역 M vs 패킷 쌍별 tight M)
- Greedy vs ILP 결과 병렬 비교
- 제약 조건 카테고리별 시각화 (홉 체인, 데드라인, 비중첩, 경로 선택)

### 9.2 Scheduler Animation (`roii-ilp-viz.html`)

Greedy 스케줄러가 패킷을 하나씩 배치하는 과정을 시각화한다.

**기능:**
- 간트 차트에 패킷이 하나씩 배치되는 애니메이션
- Web Audio API로 배치 시 사운드 효과
- 토폴로지 그래프에서 현재 처리 중인 플로우 하이라이트
- 충돌(overlap conflict) 실시간 감지 및 표시
- Standard / Reconf / Optimal 모델 전환
- 재생 속도 조절 (0.5x ~ 4x)

### 9.3 Branch & Bound Solver (`roii-bb.html`)

커스텀 B&B(분기한정법) ILP solver의 내부 동작을 D3 트리로 시각화한다.

**기능:**
- 분기(branching): 어떤 이진 변수를 선택했는지 표시
- 바운딩(bounding): LP 완화 해의 하한값 표시
- 가지치기(pruning): 하한 > 현재 최적해인 노드 자동 제거
- 각 이벤트에 Web Audio 사운드 (branch/bound/prune/optimal)
- 트리 노드 클릭으로 해당 시점의 GCL 확인
- 전체 모델 사용 — 단순화 없음

### 9.4 Custom Playground (`roii-custom.html`)

자유 토폴로지 편집 + 즉시 스케줄링이 가능한 풀 에디터이다.

**토폴로지 편집:**
- 노드: 롱프레스(600ms) 추가, 우클릭 삭제/편집, 드래그 이동
- 링크: 노드 롱프레스(500ms) → 타겟으로 드래그, 우클릭 삭제
- 플로우: 사이드바에서 추가/삭제, 카드 클릭으로 전체 속성 편집

**파라미터 튜닝 (`Ctrl+K` 커맨드 팔레트):**
- Cycle Time: 1,000 — 50,000 µs
- Guard Band: 0 — 20 µs
- Processing Delay: 0 — 20 µs

**솔버:**
- Greedy / ILP / Both 모드 선택
- Auto-Solve 토글 (모델 변경 시 자동 재계산)
- ILP 타임아웃 1—60초 조절
- 솔루션 히스토리 (최근 5개, 클릭으로 복원)

**시각화 (8탭 드로어):**
- Flows: 플로우 카드 에디터 (TX 시간, pkts/cycle 자동 계산)
- Model: 노드/링크 편집 + 글로벌 파라미터 슬라이더 + 솔버 설정
- GCL Gantt: 링크별 타임라인 (가드밴드 해칭, 크로스플로우 하이라이트)
- Delay: E2E 딜레이 바 차트 (데드라인 마커)
- Util: 링크별 활용률 도넛 차트
- Switch GCL: 스위치별 미니 간트 SVG + 8큐 게이트 마스크 블록
- Table: 패킷 스케줄 테이블 (release, end, delay, slack, status)
- JSON: 원시 GCL JSON 출력

**파일 I/O:**
- Export JSON: 전체 모델 다운로드 (`tsn-model-TIMESTAMP.json`)
- Import JSON: 저장된 모델 불러오기
- Preset: Standard / Reconf / Optimal 즉시 로딩

**3D PiP 윈도우:**
- ROii 셔틀 GLB 모델 렌더링
- 드래그 이동, 리사이즈, 확대/축소, 최소화
- 2D ↔ 3D 크로스 하이라이팅

---

*이 문서는 https://hwkim3330.github.io/ilp/ 에서 실시간 시뮬레이션으로 검증할 수 있다.*

*Generated: 2026-02-12 | Updated: 2026-02-23*
