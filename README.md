# ilp (TSN/TAS/GCL, Triangle 3-Switch, Route+Schedule ILP)

브라우저 UI + Node(GLPK) 백엔드로 동작하는 TSN GCL ILP 예제입니다.

## 실행

```bash
cd /home/kim/ilp
node server.js
```

브라우저에서 `http://localhost:8080` 접속.

## 핵심

- 3개 스위치 삼각형 토폴로지(`s1, s2, s3`)
- ILP가 **경로 선택 + 전송시각 스케줄**을 동시에 결정
- 출력: 링크별 GCL, 패킷별 E2E delay/deadline/slack, 선택된 경로
- 경로 입력은 두 방식 지원:
  - `candidate_paths[][]` 직접 지정
  - `src/dst + k_paths`로 서버가 자동 후보경로 생성(K-shortest 유사)

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
- `flows[]`
  - 수동경로: `{ id, priority, payload_bytes, period_us, deadline_us, traffic_type, candidate_paths[][] }`
  - 자동경로: `{ id, priority, payload_bytes, period_us, deadline_us, traffic_type, src, dst, k_paths }`
  - 하위호환: `path[]` 1개만 제공해도 동작
