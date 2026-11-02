# Anatomy Care Explorer (병원·클리닉)

라우트 `/industry/hospital-anatomy-explorer` · R3F 9 + drei 10 + three 0.187 + GSAP. PRD: `Hero_Industry_PRD/06_hospital_anatomy_explorer_PRD.md`.
**모든 의료 문구·의료진·시간대는 DEMO 예시**이며 진단·치료 효과를 뜻하지 않는다. 의학 검수 전.

## 파일
- `AnatomyCareExplorerHero.tsx` HeroSlot 조립(CTA·툴바·로딩·바텀시트·폴백), `Scene.tsx` 절차적 인체 모델·마커·카메라 포커스·레이어
- `Controls.tsx` 부위 선택기·레이어·움직임·교육 카드·예약 핸드오프(HTML), `useExplorer.ts` 단일 상태·URL 해시 동기화·측정 이벤트
- `config.ts` 데이터(mockRegions)·카메라·품질·`MODEL_ASSET`, `types.ts`, `QA.md`

## 제어 옵션
| 컨트롤 | 동작 |
|---|---|
| 마커 클릭 / 부위 목록 | `selectedId` 변경 → 카메라 포커스 + 일반 안내 |
| 레이어 프리셋·슬라이더 | 피부/근육/뼈 투명도(`viewMode`, `layers`) |
| 움직임 예시 | 어깨·무릎 일반 동작(`motion`), 모션 감소 시 정지 자세 |
| 되돌리기 / 초기화 / 전체화면 | 이전 선택 복귀 / 모든 상태 초기화 / 스테이지 전체화면 |
| ESC | 선택 해제 후 부위 버튼에 포커스 복귀 |
| 예약 이동(데모) | 진료과 코드만 `BOOKING_PATH?dept=` 로 전달하는 확인 상태. 이동·저장 없음 |

## 모델 교체 가이드 (`config.ts` `MODEL_ASSET.url`)
GLB 위치 `public/models/hospital-anatomy-explorer/`. 자산 체크리스트:
- 메시 이름 접두어 `skin_*` / `muscle_*` / `bone_*` (레이어 재질 연결), 단위 m, Y-up, 정면 +Z, 발끝~머리 약 4.5 높이(스케일 조정 필요 시 `Scene.tsx` `ROOT_Y`).
- 부위 마커는 `mockRegions[].marker`(모델 로컬 좌표)로 따로 정의 — 교체 후 좌표와 `focus.position/target`(카메라 거리 ≥ `minDistance`)를 재검증.
- 애니메이션 클립은 현재 미사용(움직임 예시는 코드 구동). 라이선스·의학 검수 증빙 필수.
- 폴리곤 수 목표(권장): 모바일 low 기준 약 10만 삼각형 이하. 외부 URL 로드 금지.

## 완료 / 미완료
- 완료: P0~P6 코드, 7개 인터랙션, 포스터·폴백, 모션 감소, 바텀시트, tsc/eslint 통과.
- 미완료·미검증: 브라우저 E2E, 실기기 터치, 성능 측정(패널의 fps 표시로 측정해 아래에 기록), 접근성 도구 점검, 실제 GLB·의료진·예약 페이지 연결, 의료광고 심의.
- 성능 측정 결과: 미측정 (1440×900 / 1024×768 / 390×844 에서 fps·LCP·CLS 기록 예정). 캡처: 없음.
