# ilp (JS only)

설치 없이 브라우저에서 TSN/TAS/GCL 계산 + 시각화를 수행하는 예제입니다.

## 실행

```bash
cd /home/kim/ilp
python3 -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## 기능

- 입력 JSON 편집
- Exact 탐색 기반 스케줄 계산 (브라우저 JS)
- GCL 타임라인 시각화
- Job별 deadline/slack 확인
- 생성된 GCL JSON 출력

## 입력 포맷

- `cycle_time_us`
- `guard_band_us`
- `link_speed_mbps`
- `keepout_after_tsn`
- `flows[]`
  - `id`, `priority`, `payload_bytes`, `period_us`, `deadline_us`, `traffic_type`

## 제약/주의

- 브라우저 exact 탐색 특성상 `jobs <= 12` 권장
- 더 큰 문제(복잡 GCL)는 `highs-js` 같은 WASM MILP 솔버 연동 필요
