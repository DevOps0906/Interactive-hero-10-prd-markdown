# Cursor Constellation

Canvas 2D 입자·근접 간선·커서 궤적 히어로. 라우트: `/heroes/cursor-constellation`

## 구성
- `CursorConstellationHero.tsx` 레이아웃·상태, `Scene.tsx` 캔버스 생명주기, `engine.ts` 시뮬레이션,
  `useHeroInteraction.ts` 포인터 입력, `Controls.tsx` 설정 패널, `config.ts` 타입·프리셋.
- props: `brandText`, `ctaHref`, `ctaLabel`, `initialSettings`.
- 상태: loading -> intro -> idle <-> interacting -> transitioning -> error.

## 실행·검증
`npm run dev -- --port 3100`(팀 작업 중 미실행), `npx tsc --noEmit`, `npx eslint components/heroes/CursorConstellation`

## 성능 측정
미측정. 측정 후 장비·장면·입자 수·FPS를 여기에 기록한다. 설정 패널의 "통계 표시"로 확인 가능.

## 알려진 제약
- 실행·캡처·실기기 검증 미수행. 터치는 touch-action: pan-y(세로 스크롤 우선).
- CTA는 공용 HeroSlot이 CTA 슬롯이 없어 래퍼에서 앵커를 절대 배치했다.
