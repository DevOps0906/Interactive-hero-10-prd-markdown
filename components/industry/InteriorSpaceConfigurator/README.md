# Interior Space Configurator

인테리어·부동산·가구 쇼핑몰용 3D 공간 구성 히어로. 라우트 `/industry/property-interior-configurator`. PRD: `Hero_Industry_PRD/10_property_interior_configurator_PRD.md`.
Next.js 16 / React 19 / R3F 9 / three 0.187 / GSAP. 가격·치수·채광은 모두 **데모 값**이다.

## 파일
| 파일 | 역할 |
|---|---|
| `InteriorSpaceConfiguratorHero.tsx` | HeroSlot 조립, Scene 지연 로딩(`ssr:false`), 포스터 폴백, 측정 이벤트 |
| `Scene.tsx` | R3F 장면(방 셸, 절차적 가구, 조명 보간, Orbit/Walk 카메라, 치수 라벨) |
| `Controls.tsx` | 패널(시점·소재·가구·채광·선택 상태·견적·폼), 모바일 바텀시트 |
| `Overlay.tsx` | 스테이지 위 되돌리기/초기화/치수/전체화면 |
| `useConfigurator.ts` | 단일 reducer: `selectedId`, `viewMode`, `config`, `isAnimating` + 되돌리기 이력 |
| `logic.ts` | 겹침 검사, 견적 계산, JSON 직렬화/검증, 구성 ID, 측정 이벤트 |
| `config.ts` / `types.ts` | 방 치수, 소재·가구·채광·시점 데이터, GLB 교체 지점, 가격 adapter |

## 제어 옵션
| 영역 | 옵션 | 값 |
|---|---|---|
| 시점 | 방 전체 / 걸어서 보기 | 걷기 위치 입구·창가·정면 벽, 좌/우 둘러보기 20° |
| 바닥 | 오크·월넛·콘크리트·화이트 타일 | PBR color/roughness/metalness |
| 벽 | 웜 화이트·세이지·그레이지·딥 네이비 | 〃 |
| 천장 | 화이트·크림·우드 패널 | 걷기 시점에서만 보임 |
| 가구 | 소파·커피 테이블·러그·책장·램프 | 배치/제거, 선택 후 바닥 클릭 또는 화살표(10cm), 90° 회전, 겹침 경고(러그 제외) |
| 채광 | 오전/오후/야간 | 야간은 램프 배치 시 램프 점광 |
| 치수 | 켜기/끄기 | 방·가구 규격 라벨(참고용) |
| 저장 | 구성 저장/불러오기 | localStorage에 구성 JSON만 저장(개인정보 없음) |

## 모델 교체 가이드
1. GLB를 `public/models/property-interior-configurator/`에 둔다(외부 URL 금지). 압축 예: `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`.
2. `config.ts`의 `MODEL_ASSET`에 경로를 넣는다: `room`(방 셸), `furniture.<id>`(가구별).
3. 규약: 단위 m, Y-up, 방 원점=바닥 중앙. 셸 재질 이름 `MAT_Floor/MAT_Wall/MAT_Ceiling`(로드 후 소재 스와치가 이 슬롯을 교체). 가구 노드 `FURN_Sofa/FURN_Table/FURN_Rug/FURN_Shelf/FURN_Lamp`, 원점=바닥 중앙·전면 +Z·실규격(m)과 일치.
4. 로드 실패 시 절차적 모델로 자동 폴백한다. 자산 체크리스트는 패널 하단 "모델 교체 체크리스트"와 `ASSET_CHECKLIST`.
5. GLB 경로는 아직 실제 파일로 시험하지 않았다(미검증). 방 GLB 사용 시 창·문 개구부 연출은 GLB 쪽 책임이다.

## 데이터 주입
가격 변수는 `config.ts`의 `PricingAdapter`(`mockPricing`, source `DEMO`)로 주입한다. 실제 단가·재고 API가 생기면 같은 형태로 교체한다.

## 측정 이벤트
`window`에 `CustomEvent("hero-analytics")`로 `hero_view`, `hero_interact`, `hero_select`, `hero_cta_click`, `lead_submit`을 발행한다. 개인정보는 담지 않는다(구성 ID·개수만). 수집 도구 연결은 소비 측에서 리스너로 처리한다.

## 완료 / 미완료
- 완료(코드, 정적 검증 통과): P0 자산 계약(위 규약·체크리스트), P1 정적 레이아웃·포스터, P2 3D 기반(조명·카메라 한계·로딩/에러/폴백), P3 인터랙션 7개, P4 견적 폼 데모 흐름, P6 문서.
- 미검증: 브라우저 실제 동작 전반(P5 시나리오), 터치, 느린 네트워크, 반응형 4구간, 성능 수치·캡처, GLB 로드 경로.
- 미구현: 브라우저 뒤로가기 시 구성 복원(저장/불러오기로 대체), A/B 테스트 분기, 실제 GLB 자산, 일조량 분석 엔진.
- 성능 측정 결과·캡처: 빌드/실행이 금지된 환경이라 없음. 통합 후 Lighthouse(LCP/CLS)와 DevTools Performance로 측정해 이 표에 기록할 것.
