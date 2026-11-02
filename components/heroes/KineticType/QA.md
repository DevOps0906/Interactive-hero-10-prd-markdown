# Kinetic Type QA (PRD 7장 DoD)

실행 환경 제약으로 `next dev/build`와 브라우저 실행은 하지 않았다. 아래 "통과"는 정적 검증(tsc·eslint)과 코드 검토 기준이고, 실기기 항목은 미검증이다.

| DoD 항목 | 결과 | 근거 / 비고 |
|---|---|---|
| tsc --noEmit | 통과 | 오류 0 |
| eslint (KineticType, app/heroes/kinetic-type) | 통과 | 오류·경고 0 |
| 인터랙션 1 seamless marquee | 구현 | 한 벌 너비 측정 → ceil(vw/w)+1 복제, x를 w로 modulo 순환 (`useHeroInteraction.ts`, `Scene.tsx`) |
| 인터랙션 2 스크롤 속도 → marquee | 구현 | ScrollTrigger velocity, 지수 스무딩·clamp, 방향 반전 |
| 인터랙션 3 variable font axis | 구현(제한) | `--kt-wght/--kt-wdth` → font-variation-settings. Pretendard Variable은 wght만 있어 wdth는 폰트가 축을 지원할 때만 보임 |
| 인터랙션 4 글자 stagger reveal | 구현 | rotate·yPercent stagger, "다시 보기" 버튼으로 재생 |
| 인터랙션 5 포인터 속도 skew | 구현 | quickTo skewX, ±12도 clamp, 체크박스로 토글 |
| 인터랙션 6 Pin/Scrub 확대·전환 | 구현 | ScrollTrigger pin + scrub, 제목 scale 1~2.6, NEXT SCENE 페이드, 체크박스로 pin 토글 |
| 인터랙션 7 aria-hidden 복제·reduced motion | 구현 | 복제본 aria-hidden, 스테이지 전체 aria-hidden, reduced면 ticker·pin 미생성 정적 1벌 |
| 미지원 장치에서 제목·CTA 정상 표시 | 코드 검토 | H1·CTA는 일반 HTML(스테이지 밖), 오류 시 state=error 정적 폴백 |
| 품질 하향 | 구현 | detectQualityTier → 줄 수·skew 프리셋, 90프레임 평균 24ms 초과 시 downgradeTier |
| unmount 자원 정리 | 코드 검토 | ticker 제거, ScrollTrigger kill, ResizeObserver disconnect, pointer 리스너·타이머·tween 정리 |
| 상태 충돌 방지 | 코드 검토 | loading→intro→idle→interacting→transitioning, error는 되돌리지 않음, 전환 중 replay 무시 |
| 키보드 조작 | 코드 검토 | CTA 앵커, 네이티브 range/checkbox/button, 포커스 링은 전역 토큰 |
| 1440/1024/390 겹침·잘림 | 미검증 | 브라우저 확인 필요. 모바일 CTA는 상단 우측에 배치 |
| 60fps(데스크톱)/30fps(모바일) 실측 | 미검증 | 측정값 없음 (장비·프레임 기록 필요) |
| 탭 전환·리사이즈·재진입 누수 | 미검증 | 구조상 정리 로직은 있으나 실측 안 함 |
| 캡처/영상 | 미검증 | 브라우저 실행 후 필요 |
| 벤치마킹 자산 무단 복사 없음 | 통과 | 자체 구현, 외부 자산 없음 |

## 알려진 제약
- README(프로젝트 루트)는 쓰기 허용 범위 밖이라 수정하지 않음.
- `public/heroes/kinetic-type/`는 사용 자산이 없어 만들지 않음.
