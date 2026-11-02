# Depth Parallax (05)

라우트 `/heroes/depth-parallax` — R3F(Three.js) 5층 원근 장면 + GSAP ScrollTrigger dolly.

## 구현 기능표
| # | 인터랙션 | 구현 |
|---|---|---|
| 1 | 3~5층 z-depth | `config.ts` LAYERS: 배경 -44 / 원경 -28 / 중경 -16 / 근경 -6 / 전경 +2 |
| 2 | 포인터 카메라 | 정규화 좌표 → 위치 이동 + 시선 회전, 레이어별 이동 배율 |
| 3 | 깊이 변위 | 레이어 그룹 오프셋을 깊이 배율로 차등 (슬라이더) |
| 4 | 스크롤 dolly | ScrollTrigger scrub tween → 합성 카메라 z |
| 5 | Fog·광원 | THREE.Fog + 커서 추적 PointLight (DOF 미채택: 모바일 비용) |
| 6 | 전경 오브젝트 | 클릭/버튼 → 카메라 포커스 tween + 정보 패널 (Esc 해제) |
| 7 | 모바일·접근성 | 범위 0.5배, 방향키/D-pad, reduced-motion(정지·demand 렌더) |

카메라는 `composeCamera()` 한 곳에서 포인터·스크롤·인트로·포커스를 합성한다. 상태: loading → intro → idle ⇄ interacting / transitioning → fallback.

## 구조
`DepthParallaxHero.tsx`(클라이언트 루트·props 계약) · `Scene.tsx`(R3F, 동적 import) · `Controls.tsx` · `useHeroInteraction.ts` · `config.ts` · `SceneBoundary.tsx` · `depth-parallax.module.css`. 정적 폴백: `public/heroes/depth-parallax/fallback.svg`.

## 실행·검증
`npm run dev` (http://localhost:3100/heroes/depth-parallax) · `npx tsc --noEmit` · `npx eslint components/heroes/DepthParallax app/heroes/depth-parallax`

## 성능 측정 (미측정)
설정 패널 상단 status에 실측 fps가 표시된다. 측정 장비·장면·입자 수(low 400 / medium 900 / high 1800)·fps를 아래에 기록할 것.

| 장비 | 해상도 | 품질 | 별 수 | fps |
|---|---|---|---|---|
| (미측정) | | | | |

## 알려진 제약
- 브라우저 실행 검증·스크린샷·fps 측정 미수행. DOF 미구현. 방향키는 히어로 내부 포커스 시 시점 이동에 사용(페이지 스크롤은 PageUp/Down·Space).
- reduced-motion 시 scroll dolly는 유지(사용자 조작 연동)하되 범위 50%, 자동 회전·보간 없음.
