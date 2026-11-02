# Scroll Storytelling QA (PRD 7장 DoD)

검증 환경: 정적 검사만 실행(`tsc --noEmit`, `eslint` 통과). 브라우저 실행·캡처·fps 측정은 금지 범위(dev/build)라 **미검증**.

| DoD 항목 | 구현 위치 | 상태 |
|---|---|---|
| 인터랙션 1 챕터 4개(목적·길이·카피) | config.ts CHAPTERS, 챕터당 100svh | 구현 / 브라우저 미검증 |
| 2 pin + scrub timeline | sticky stage + ScrollTrigger(scrub, 단일 timeline, window scroller) | 구현 / 미검증 |
| 3 카메라 keyframe 보간 | config.ts CAMERA_KEYS, Scene.tsx sampleCamera·CameraRig | 구현 / 미검증 |
| 4 회전·확대·폭발·재조립 | config.ts explodeAmount·rotationAngle, Scene.tsx Model | 구현 / 미검증 |
| 5 텍스트+3D 단일 timeline | useHeroInteraction.ts tl(progress 프록시 + 텍스트 tween) | 구현 / 미검증 |
| 6 snap + dot 내비 + 키보드 | snapTo 1/3, dot 버튼, CTA, ←/→ 키, Controls 챕터 버튼 | 구현 / 미검증 |
| 7 resize refresh·touch·reduced-motion | ST 자동 refresh + ready/visibility refresh, StaticStory 폴백 | 구현 / 미검증 |
| 타이틀·CTA 미지원 장치 표시 | StaticStory(reduced-motion, WebGL 오류/context lost), SSR H1 | 구현 / 미검증 |
| 품질 하향·자원 정리 | detectQualityTier, downgradeTier(90프레임 평균), IO·탭 숨김 시 frameloop never, geometry dispose, 리스너·timer·ST 정리(useGSAP revert) | 구현 / 미검증 |
| 실기기 캡처·fps | — | 미수행 (측정 장비·fps 기록 없음) |
| 무단 복제 없음 | 자체 절차 생성 geometry | 충족 |

미해결: 1440x900/1024x768/390x844 겹침 확인, 탭 복귀·재진입 누수, 모바일 30fps 측정, README·스크린샷.
