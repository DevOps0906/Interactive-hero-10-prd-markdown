# Sneaker Configurator Hero (04, `/industry/sneaker-customizer`)

3D 스니커즈를 돌려 보고 갑피/밑창/끈/뒤꿈치 색과 갑피 소재·사이즈를 고른 뒤 장바구니에 담는 전환형 히어로. 가격·재고·SKU·장바구니는 모두 **데모(mockData, 메모리 전용)** 이며 개인정보를 수집·저장하지 않는다. 형태는 오리지널(타사 디자인·로고 없음).

## 사용법
- `SneakerConfiguratorHero` 를 렌더하면 된다(`app/industry/sneaker-customizer/page.tsx`). H1·설명·CTA·옵션은 HTML, 3D 는 `Scene.tsx`(클라이언트 전용 동적 로드)가 aria-hidden 스테이지에 그린다.
- 상태는 `useConfigurator.ts` 한 곳(`selectedId`, `viewMode`, `config`, `isAnimating` + 되돌리기 이력, 장바구니). 3D 재질과 HTML 요약은 같은 `config` 에서 파생된다.
- 외부 데이터 주입: 재고/가격은 `config.ts` 의 `resolveVariant`(현재 mock), 장바구니는 `CartAdapter`(`useConfigurator(adapter)`).
- 측정 이벤트: `window` 의 `hero:event` CustomEvent (`hero_view`·`hero_interact`·`hero_select`·`hero_cta_click`·`lead_submit`, 개인정보 없음).

## 제어 옵션
| 영역 | 컨트롤 | 동작 |
|---|---|---|
| 도구 모음 | 기본/측면/상단/후면 | 카메라 각도 프리셋(0.7초 이동, 드래그 시 "기본"으로 표시) |
| | 구조 분해 | 갑피·밑창·끈·뒤꿈치 분리/복귀 (모션 감소 시 즉시 전환) |
| | 360° 회전 | 인트로 회전 재생 (첫 로드에도 1회) |
| | 되돌리기/다시/초기화 | 옵션 이력 30단계 |
| | 전체화면 / 정적 이미지 | 스테이지 전체화면, 3D 대신 현재 색을 반영한 SVG |
| 색상 | 부위 4개 × 팔레트 8색 | 3D 부위를 클릭해도 부위 선택 |
| 소재 | 캔버스/메쉬/스웨이드 + 확대해서 비교 | 코드로 그린 텍스처·거칠기·가격 매핑, 확대 뷰 |
| 사이즈 | 230~290mm | 재고 텍스트 표시, 없는 조합은 담기 차단 |
| 장바구니 | 담기/빼기/구매하기(데모) | 성공·실패 `role=status` 알림, 재고 초과 시 실패 |

## 모델 교체 가이드
`public/models/sneaker-customizer/README.md` 의 체크리스트 참조. `MODEL_ASSET.url` 만 바꾸면 되며 노드가 누락되면 절차적 모델로 대체한다.

## 품질·폴백
DPR 상한(`lib/hero/performance`), 화면 밖·탭 숨김 시 렌더 중단, 평균 프레임 시간이 20ms 초과 시 품질 한 단계 하향, WebGL 실패·컨텍스트 손실 시 포스터/SVG + HTML 폼 유지(다시 시도 버튼), reduced-motion 은 on-demand 렌더·즉시 전환, 스테이지 `touch-action: pan-y` 와 휠 줌 없음.

## 완료 / 미완료
- 완료: PRD 인터랙션 7개, 포스터·로딩·에러 폴백, 모바일 바텀시트, 키보드(radio·버튼)·ESC, 메모리 해제 코드.
- 미완료/미검증: 실제 GLB(절차적 모델 사용), 실제 브라우저 런타임·모바일 실기기 테스트, 성능 수치(LCP/CLS/fps)·캡처 — 팀장이 서버 실행 후 측정해 이 절에 기록할 것. 실제 고객 5명 조작 테스트 미실시.
