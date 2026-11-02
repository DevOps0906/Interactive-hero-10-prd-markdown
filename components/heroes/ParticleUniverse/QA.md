# Particle Universe — QA (PRD 7장 DoD)

작성: 2026-11-03. 이 세션은 `next dev/build` 실행이 금지되어 **브라우저 실측은 하지 않았다**. 정적 검사 결과와 코드 근거만 기록하고, 실행이 필요한 항목은 "미검증"으로 남긴다.

| # | DoD 항목 | 결과 | 근거 / 확인 방법 |
|---|---|---|---|
| 1 | 인터랙션 1 Fibonacci sphere + typed buffer | 구현 (런타임 미검증) | `geometry.ts` buildParticles: Float32Array 위치·색·크기·seed |
| 2 | 인터랙션 2 sphere/spiral/mark 동일 입자 수 morph | 구현 (런타임 미검증) | 같은 count로 3 버퍼 생성, `uShape` 가중치 + `uMorphProgress`; 패널 "형태 변환" 버튼 |
| 3 | 인터랙션 3 커서 Ray ∩ 가상 평면 반발/인력 | 구현 (런타임 미검증) | `sim.ts` stepFrame, 셰이더 uMouse/uForce; 패널 "커서 필드" |
| 4 | 인터랙션 4 OrbitControls damping/자동회전 분리 | 구현 (런타임 미검증) | Scene `Controls3D`: enableDamping 고정, autoRotate는 interacting 중 off; 패널 체크박스·회전 버튼 |
| 5 | 인터랙션 5 uTime/uMouse/uMorphProgress 셰이더 | 구현 (런타임 미검증) | `shaders.ts` |
| 6 | GSAP 타임라인 카메라→집결→타이틀→CTA | 구현 (런타임 미검증) | `ParticleUniverseHero.tsx` useGSAP; "인트로 다시 재생" 버튼 |
| 7 | 인터랙션 7 Adaptive DPR·입자 프리셋·비가시 정지·정적 이미지 | 구현 (런타임 미검증) | `lib/hero/performance.ts` 재사용, frameloop never(탭 숨김/화면 밖), `public/heroes/particle-universe/fallback.svg` |
| 8 | 효과 미지원 장치에서도 타이틀·CTA 표시 | 구현 (런타임 미검증) | H1·설명은 서버 렌더 HTML, Scene은 `ssr:false`+ErrorBoundary+webglcontextlost -> error 상태에서 SVG 폴백, CTA 항상 활성 |
| 9 | 품질 하향·자원 정리 | 구현 (런타임 미검증) | 1초 창 평균 프레임 > 예산(데스크톱 20ms/모바일 34ms)이면 `downgradeTier`; Canvas unmount 시 R3F가 renderer/geometry/material dispose, GSAP 타임라인 kill, 리스너·IntersectionObserver·타이머 cleanup |
| 10 | 실기 캡처/영상/로그 | **미검증** | 브라우저 실행 금지로 수행 못함. 아래 체크리스트로 후속 수행 필요 |
| 11 | 무단 복사 없음 | 통과 | Lusion 코드·자산 미사용, 자체 생성 |
| 12 | 접근성: 키보드·reduced-motion | 구현 (런타임 미검증) | 설정 패널은 전부 네이티브 button/input/select, Esc로 닫기, CTA는 패널로 포커스 이동; reduced-motion이면 frameloop demand, 자동회전·시간·커서 필드·morph 애니메이션 off |

## 자동 검사
- `npx tsc --noEmit` 통과
- `npx eslint components/heroes/ParticleUniverse app/heroes/particle-universe` 통과 (react-hooks v7 규칙 포함)
- `npm run build`: 미실행(금지)

## 실측 체크리스트 (후속)
1. `npm run dev` -> `/heroes/particle-universe` 새로고침, 콘솔 오류 0 확인
2. 1440x900 / 1024x768 / 390x844 겹침·잘림 (lg 미만은 CTA·패널이 히어로 아래)
3. 드래그·클릭·마우스 이동 반복 후 상태 꼬임 없음(`data-state` 속성으로 확인)
4. 탭 전환·리사이즈·다른 히어로로 이동 후 재진입, 메모리 누수 확인
5. 패널의 fps/입자 수/DPR 표시를 읽어 README 성능 표에 기록 (장비·장면·입자 수 포함)
