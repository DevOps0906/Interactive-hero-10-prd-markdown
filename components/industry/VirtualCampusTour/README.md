# Virtual Campus Tour (08) — 입시학원·직업학교·교육기관

라우트 `/industry/academy-virtual-campus`. 핵심 CTA: 상담·시설 방문 예약(데모 폼). 모든 과정·시간표·수용 인원은 `DEMO` 예시이며 실제 성과 수치(취업률·합격률)는 없다.

## 진행 현황
- 완료: P0 자산 계약, P1 정적 레이아웃·포스터, P2 3D 기초(절차적 모델·조명·카메라 한계·로딩/에러/폴백), P3 인터랙션 7종, P4 예약 데모 흐름·모바일/저사양 폴백, P5 정적 검증(tsc·eslint), P6 문서.
- 미완료/미검증: 브라우저 실행·실기기 터치·성능 측정(fps·LCP·CLS)·캡처는 이번 작업에서 실행하지 못함(next dev/build 금지). 실제 GLB 모델 없음.

## 구성
| 파일 | 역할 |
|---|---|
| `VirtualCampusTourHero.tsx` | HeroSlot 조립, 전체화면·Esc, 폴백 포스터 |
| `useCampusTour.ts` | 단일 상태(reducer): selectedId·viewMode·isAnimating·tour/journey·compare·history |
| `Scene.tsx` | R3F 장면, 카메라 리그, 절차적 모델/GLB, 화면 밖 렌더 중단, 품질 자동 하향 |
| `Overlay.tsx` | 스테이지 위 툴바(전경·투어·모드·되돌리기·초기화·전체화면)와 요약/시간표 카드(모바일 바텀시트) |
| `Panel.tsx` | 공간 선택, 학생 여정, 과정 비교, 방문 예약 폼 |
| `config.ts` | 데이터 어댑터 형태(`CampusData`), `DEMO_DATA`, 카메라·품질·`MODEL_ASSET`, 측정 이벤트 `track` |

## 인터랙션 → 구현
1 가이드 투어(로비→강의실 A→실습실, 단계 3.2초) / 2 공간 핫스팟(3D 클릭·라벨·목록, 요약 카드) / 3 모드 전환(자유 탐색 Orbit, 프리셋 이동 ◀▶) / 4 시간표(카드 안 표) / 5 과정 비교(2개 선택 표) / 6 학생 여정(4단계가 카메라와 연동) / 7 방문 예약(선택 공간 반영, 날짜·인원 검증).

## 제어 옵션
| 컨트롤 | 동작 |
|---|---|
| 캠퍼스 전경 / Esc / 닫기 | 선택 해제, 전경 카메라 |
| 가이드 투어 | 시작/정지(수동 조작 시 중단) |
| 자유 탐색 / 프리셋 이동 | 드래그 회전(줌·이동 없음) / 드래그 잠금+이전·다음 공간 |
| 되돌리기 | 직전 선택으로(최대 20단계) |
| 초기화 | 선택·모드·투어·비교 초기값 |
| 전체화면 | 스테이지(+툴바) 전체화면 |

## 모델 교체 가이드
1. GLB를 `public/models/academy-virtual-campus/campus.glb`에 둔다(규격: 같은 폴더 `README.md`).
2. `config.ts`의 `MODEL_ASSET.url`을 `"/models/academy-virtual-campus/campus.glb"`로 바꾼다.
3. 필수 노드 `room-<SpaceId>`가 하나라도 없으면 로드 시 오류를 내고 절차적 모델로 폴백한다.
4. 공간 좌표·크기를 바꿨다면 `DEMO_DATA.spaces[].position/size`(또는 주입 데이터)를 모델과 맞춘다.
5. 실제 시설과 다른 모형임을 화면 고지로 유지한다. 라이선스·출처를 모델 폴더에 기록한다.

## 데이터 주입
`<VirtualCampusTourHero data={...} />`로 `CampusData`(spaces·programs·schedule·journey)를 넘긴다. 서버 연동은 별도 어댑터에서 변환해 주입한다.

## 측정 이벤트
`window`의 `hero-event` CustomEvent: `hero_view` `hero_interact` `hero_select` `hero_cta_click` `lead_submit`. 개인정보는 싣지 않는다.

## 미구현·후속
- 자동 투어 vs 바로 조작 등 A/B 분기, 실제 WASD 걷기 모드(현재 Walk는 프리셋 이동), 실제 GLB, 성능 측정 결과와 캡처.
