# Particle Universe (히어로 01)

Fibonacci 구로 집결한 GPU 파티클이 커서에 반응하고 구 / 나선 / 브랜드 마크로 변환된다. 라우트 `/heroes/particle-universe`.

## 진행 현황
- P0~P5 구현 완료. 타입·lint 통과. 브라우저 실측·캡처는 미수행 (QA.md 참고).

## 콘텐츠 바로가기
- [QA 표](./QA.md) · [PRD](../../../Hero_PRD/01_particle-universe_PRD.md)

## 실행
`npm install` -> `npm run dev` (포트 3100) -> http://localhost:3100/heroes/particle-universe

## 구조
| 파일 | 역할 |
|---|---|
| `ParticleUniverseHero.tsx` | 클라이언트 히어로, GSAP 인트로 타임라인, 폴백·ErrorBoundary |
| `Scene.tsx` / `sim.ts` / `shaders.ts` / `geometry.ts` | R3F 씬, 프레임 갱신, GLSL, 입자 버퍼 |
| `Controls.tsx` | 설정 패널(형태·필드·회전·속도·강도·강조색·입자 수 프리셋) |
| `useHeroInteraction.ts` | 상태 머신(loading/intro/idle/interacting/transitioning/error), 포인터·가시성 |
| `config.ts` | 타입·기본값·품질 프리셋(8천/2.4만/6만). `ParticleUniverseHeroProps`로 초기 설정 주입 가능 |

## 설계 메모
- 입자 좌표는 React state를 쓰지 않는다. GPU attribute + uniform만 갱신.
- 형태 변환은 3개 형태의 가중치(`uShape`)를 보간해 도중에 바꿔도 튀지 않는다.
- 터치: 캔버스에 `touch-action: pan-y` 적용(세로 스크롤 허용, 가로 드래그로 회전). 휠 줌은 페이지 스크롤을 위해 끔.

## 성능 측정값
미측정. 패널의 fps 표시를 이용해 아래 표를 채운다.

| 장비 | 장면 | 입자 수 | DPR | fps |
|---|---|---|---|---|
| - | - | - | - | - |

## 알려진 제약
- 실제 브라우저 검증 전. 구 형태 외 형태에서의 화면 맞춤은 구 기준 스케일이다.
- 인트로 시작 시 타이틀이 잠깐 숨었다 나타난다(SSR 가시성 우선 설계).
