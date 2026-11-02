# Knowledge Galaxy QA (PRD 7장 DoD)

검증 환경 제약: 병렬 작업으로 `next dev`/`next build` 및 브라우저 실행을 하지 않았다. 코드 검사만 수행했고, 런타임 항목은 **미검증**이다.

| # | DoD 항목 | 구현 근거 | 상태 |
|---|---|---|---|
| 1 | 7가지 인터랙션 각각 시연 | Controls 도움말 7항목 + 버튼(전체 보기·이웃만 보기·인트로 재생·시뮬레이션 재가열·flow/노드 수 토글). 1 `forceSim.ts` 분리, 2 OrbitControls+hover 중 회전 비활성+노드 드래그, 3 GSAP 인트로(hop별 지연·간선 draw-in), 4 hover/click 분리·선택 링·간선 강조, 5 `Scene.tsx` updateLabels(거리·가림·겹침), 6 카메라 포커스·1-hop 필터, 7 flow dots·InstancedMesh·시뮬 정지·노드 수 제한 | 코드 구현 / 동작 미검증 |
| 2 | 미지원 장치에서 타이틀·CTA 정상 | H1·설명은 HeroSlot HTML, CTA·패널은 DOM. WebGL 미지원·런타임 오류 시 `Fallback`(정적 SVG+노드 목록) | 코드 구현 / 미검증 |
| 3 | 품질 하향·자원 정리 | `detectQualityTier`+프리셋(노드·dots·라벨·세그먼트·DPR), 프레임 평균 24ms 초과 시 `downgradeTier`. 화면 밖/일시정지 시 `frameloop="never"`. unmount: R3F가 renderer·geometry 정리, GSAP tween kill, IntersectionObserver disconnect, 커서 복원 | 코드 구현 / 누수 측정 미검증 |
| 4 | 데스크톱·모바일 실측 근거 | 캡처·영상·fps 로그 없음 | 미수행 |
| 5 | 벤치마크 소스·자산 무단 복사 없음 | 자체 구현(force sim, 렌더링), 외부 자산 없음 | 통과(자체 확인) |

## 자동 검사
| 명령 | 결과 |
|---|---|
| `npx tsc --noEmit` | 통과 |
| `npx eslint components/heroes/KnowledgeGalaxy app/heroes/knowledge-galaxy` | 통과 |
| `next build` / 실행 | 미수행(금지) |

## 6장 검수 시나리오 (수동 확인 필요)
진입 오류 없음 · 마우스 연속 조작 · 1440×900 / 1024×768 / 390×844 겹침 · 키보드/reduced-motion · fps 측정(README 기록) · 탭 전환·리사이즈·재진입 누수 · `npm run build`.

## 알려진 제약·가정
- d3-force-3d 미설치 → 자체 3D force sim(`forceSim.ts`) 사용. drei `Html` 대신 DOM 라벨 레이어를 직접 투영(노드 수만큼 Html 컴포넌트를 쓰지 않기 위함).
- 공용 `.hero`/`.hero-stage` 규칙은 수정하지 않고 `kg.module.css`에서 이 히어로 범위만 덮어씀(스테이지가 aria-hidden이라 키보드 조작은 스테이지 밖 패널의 버튼·노드 목록으로 제공).
- 키보드로 3D 노드를 직접 포커스하지는 않고, 노드 목록(검색 포함)이 동등 기능을 제공.
