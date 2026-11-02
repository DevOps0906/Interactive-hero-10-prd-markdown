# Real Estate Unit Explorer

라우트 `/industry/realestate-unit-explorer`. R3F 9 + drei 10 + three 0.187 + GSAP. 분양·부동산 중개용: 외관 → 층 → 호실 요약 → 문의.

## 파일
- `RealEstateUnitExplorerHero.tsx` 히어로(HeroSlot 사용, `adapter` props로 매물 주입)
- `Scene.tsx` Canvas·절차적/GLB 모델·Picking·단면·카메라 시점
- `Panel.tsx` 층/레이어/시점/호실 목록·정보·비교표·문의 폼 · `Overlay.tsx` 툴바·요약(모바일 바텀시트)
- `useExplorer.ts` 단일 상태(`selectedId`·`viewMode`·`floor`·`isAnimating`…) + `#unit=<id>` 딥링크 + 측정 이벤트
- `config.ts` 치수·상태 색·품질 프리셋·**`MODEL_ASSET`**·`ASSET_CHECKLIST` · `data.ts` 샘플 매물(`mockAdapter`)

## 제어 옵션
| 옵션 | 위치 | 설명 |
|---|---|---|
| 층 선택 / 단면 보기 | 패널 | 선택 층 위 외피 숨김, 복도 표시 |
| 분양 상태 레이어 | 패널 | 분양 가능·예약·완료 표시/숨김(숨기면 선택 불가) |
| 시점 | 패널 | 외관 · 창 방향 조망(호실 선택 필요) · 층 평면 |
| 비교 | 요약 | 최대 2호실 표 |
| 되돌리기 / 초기화 / 전체화면 | 3D 위 툴바 | 선택 이력 20건, 전체 초기화 |
| 문의 | 폼 | 선택과 양방향 연동, 데모(전송·저장 없음) |

## 모델 교체 가이드
1. GLB를 `public/models/realestate-unit-explorer/`에 둔다(라이선스 확인).
2. `config.ts`의 `MODEL_ASSET.url`에 경로를 넣는다.
3. 노드 이름은 `F_<층>` 그룹 아래 `U_<id>`(예 `U_101-502`), 옥상 `ROOF`, 복도 `C_<층>`. 호실 id가 하나라도 없으면 절차적 모델로 자동 대체하고 콘솔에 경고한다.
4. 매물은 `UnitsAdapter.load()`가 돌려준다(형식: `public/models/.../units.sample.json`). 실매물 DB 연결 전까지 DEMO 표시를 유지한다.

## 완료/미완료
- 완료(코드): P0 자산 계약(체크리스트), P1~P4 전체, 7개 인터랙션, 폴백(WebGL·로드 실패·reduced-motion).
- 미구현/제한: 동은 101동 1개만, 실제 GLB·HDR 없음, 자동 투어 없음, 로딩 진행률 표시 없음(절차적 모델은 즉시).
- 미검증: 브라우저 실행·실기기·성능(LCP/CLS/fps)·캡처. 결과표는 `QA.md`. 성능은 패널 "조작 안내" 의 추정 FPS로 측정해 아래에 기록한다.

| 측정일 | 장비/해상도 | 품질 | fps | 비고 |
|---|---|---|---|---|
| — | 미측정 | — | — | — |
