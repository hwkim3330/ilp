# ilp (JS network solver: Exact + MILP)

브라우저에서 TSN/TAS/GCL을 계산하고 시각화하는 단일 페이지 예제입니다.

## 실행

```bash
cd /home/kim/ilp
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 모드

- `Exact Search`: 작은 입력에서 정확해 탐색(매우 느려질 수 있음)
- `MILP (GLPK WASM)`: 브라우저에서 GLPK로 이진변수 기반 스케줄링

## 입력 스키마

- `cycle_time_us`
- `guard_band_us`
- `processing_delay_us`
- `nodes[]`: `{ id, type }`
- `links[]`: `{ id, from, to, rate_mbps, prop_delay_us }`
- `flows[]`: `{ id, priority, payload_bytes, period_us, deadline_us, traffic_type, path[] }`

## 출력

- 링크별 GCL 타임라인
- 패킷별 E2E delay/deadline/slack
- 생성된 GCL JSON

## 주의

- Exact는 packet 수가 조금만 커져도 폭발적으로 느려짐
- MILP는 CDN에서 `glpk.js`를 로드하므로 인터넷 연결 필요
