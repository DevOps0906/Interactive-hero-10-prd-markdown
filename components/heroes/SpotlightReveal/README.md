# Spotlight Reveal (04)

이중 레이어·커서 마스크 히어로. 라우트 `/heroes/spotlight-reveal`.

## 진행 현황
- P0~P5 코드 구현 완료. tsc·eslint 통과.
- 브라우저 실측(캡처·fps)은 미수행 → `QA.md` 참고.

## 구성
- `SpotlightRevealHero.tsx` 조립·props 계약(`scenes`, `ctaLabel`, `options`) / `Scene.tsx` DOM Stage / `Controls.tsx` 설정·검증 패널 / `useHeroInteraction.ts` 입력·상태 머신 / `config.ts` 옵션·프리셋.
- 상태: loading → intro → idle ↔ interacting → transitioning → fallback.
- 토큰: `--hero-bg/fg/accent/speed/intensity`.

## 실행
`npm run dev -- --port 3100` 후 `/heroes/spotlight-reveal`.

## 알려진 제약
`QA.md` 하단 참조. 성능 값은 측정 후 기록한다(현재 없음).
