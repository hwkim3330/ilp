# ilp (TSN/TAS/GCL, Triangle 3-Switch, ILP)

브라우저 UI + Node(GLPK) 백엔드로 동작하는 TSN GCL ILP 예제입니다.

## 실행

```bash
cd /home/kim/ilp
node server.js
```

브라우저에서 `http://localhost:8080` 접속.

## 구성

- `index.html`: 입력/토폴로지/결과 시각화 UI
- `server.js`: ILP 모델 생성 + GLPK 풀이 + GCL 결과 생성 API
- `vendor/glpk.min.js`, `vendor/glpk.wasm`: 로컬 GLPK 엔진

## API

- `POST /api/solve`
  - body: 모델 JSON
  - response: `packetRows`, `gcl`, `objective`, `stats`

## 모델 포맷

- `cycle_time_us`
- `guard_band_us`
- `processing_delay_us`
- `nodes[]`: `{ id, type }`
- `links[]`: `{ id, from, to, rate_mbps, prop_delay_us }`
- `flows[]`: `{ id, priority, payload_bytes, period_us, deadline_us, traffic_type, path[] }`

## 메모

- 현재 샘플은 3개 스위치 삼각형(`s1, s2, s3`) 기준
- ILP 목적함수는 TSN packet의 E2E delay 합 최소화
