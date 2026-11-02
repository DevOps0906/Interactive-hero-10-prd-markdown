# Dental Procedure Explorer (clinic-dental-3d)

치아 3D에서 검진·보철·교정의 **일반적인 절차**를 보여주고 상담 예약으로 연결하는 히어로. 모든 의료 문구는 일반 안내·데모이며 치료 효과·가격·기간을 단정하지 않는다. 라우트: `/industry/clinic-dental-3d`.

## 사용법
- 3D 치아를 누르거나 패널의 치아 번호(FDI) 버튼으로 선택 → 요약 카드(모바일은 바텀시트)에 설명·연결 의료진(DEMO)·예약 CTA.
- 절차 종류/단계 선택 → 선택 치아(없으면 예시 치아 16)에 3D 상태 반영: 스캔 링, 치아 형태 정리(축소), 보철 캡, 교정 브라켓·와이어·정렬.
- 단면도 보기 → 법랑질/상아질/치수/치근 층 선택(HTML 목록).
- 전·후 비교는 교육용 도식 표시와 함께만 제공. 예약 폼은 이름·연락처만 받고 전송·저장하지 않는다(DEMO).

## 파일
`config.ts`(데이터·문구·3D 상수) · `useExplorer.ts`(단일 상태, 측정 이벤트) · `Scene.tsx`(R3F) · `Panel.tsx`(조작·요약) · `Appointment.tsx`(예약 폼) · `DentalProcedureExplorerHero.tsx` · `QA.md`

## 제어 옵션
| 항목 | 위치 | 설명 |
|---|---|---|
| 치아 선택 | 차트/3D | `selectedId` (FDI 번호) |
| 보기 | 보기 조작 | `viewMode`: arch / cutaway |
| 회전·초기화·되돌리기·전체화면 | 보기 조작 | 되돌리기는 선택 이력 20단계 |
| 절차·단계 | 스테퍼 | `procedureId`, `stepIndex` |
| 단면 층 | 단면도 | `layerId` |
| 전·후 도식 | 전·후 비교 | `beforeAfter`: off/before/after |
| 품질 | 자동 | 모바일·저사양 low, 프레임 예산 초과 시 하향 |

## 모델 교체 가이드
`config.ts`의 `MODEL_ASSET.url`에 GLB 경로 지정. 노드 이름 `tooth-<FDI>`, 좌표·단위 등 체크리스트는 `public/models/clinic-dental-3d/README.md`. 의료진·시간은 `DentalProcedureExplorerHero`의 `data` prop(`DentalData`)으로 주입한다.

## 측정 이벤트
`hero_view`, `hero_interact`, `hero_select`, `hero_cta_click`, `lead_submit`을 `window` CustomEvent `hero-analytics`로 내보낸다(개인정보 제외).

## 완료 / 미완료
- 완료: PRD 인터랙션 7개, P1~P4 구현, 폴백(포스터·WebGL 실패·모션 감소), 모바일 바텀시트.
- 미완료: 실제 GLB 자산, 브라우저 뒤로가기 연동, 3D 직접 클릭으로 단면 층 선택, 성능 측정·캡처, 실기기·E2E 검증(모두 미검증).
