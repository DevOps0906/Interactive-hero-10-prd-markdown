# Spotlight Reveal — QA (PRD 7장 DoD)

검증 환경: 정적 검사만 수행(`npx tsc --noEmit`, `npx eslint` 통과). 브라우저 실행·캡처·fps 측정은 다른 작업과의 `.next` 충돌 방지 지시로 **미실행**.

| # | DoD 항목 | 구현 | 검증 상태 |
|---|---|---|---|
| 1 | 7가지 인터랙션 각각 시연 | 설정 패널 ‘인터랙션 검증’ 체크리스트가 실제 발생 시 ‘확인’으로 바뀜. 1 레이어 겹쳐 보기 / 2 `--mx --my` / 3 lerp / 4 칩·CTA hover·focus / 5 속도 왜곡 / 6 CTA·‘장면 확장’ / 7 터치 드래그·탭 토글·키보드 | 코드 구현, 수동 확인 필요 |
| 2 | 효과 미지원 장치에서 타이틀·CTA 정상 | H1·설명·CTA는 일반 HTML. mask 미지원/예외 시 `fallback` 상태: 두 장면을 마스크 없이 모두 노출 + `still.svg` | 코드 구현, 수동 확인 필요 |
| 3 | 품질 하향·자원 정리 | `detectQualityTier`로 초기 등급, 90프레임 평균 20ms 초과 시 `downgradeTier`. unmount 시 ticker·tween·리스너·ResizeObserver·visibility·reduced-motion 구독 해제. 탭 숨김 시 ticker 정지 | 코드 구현, 누수 수동 확인 필요 |
| 4 | 실기기 확인·근거 | 캡처·영상·fps 로그 없음 | **미충족**(실행 후 보완) |
| 5 | 벤치마킹 자산 무단 복사 금지 | 자체 작성(DOM+CSS mask+GSAP), 외부 자산 없음 | 충족 |

## 6장 시나리오
| 항목 | 상태 |
|---|---|
| 진입/조작/회복성 | 미검증(브라우저 실행 필요) |
| 화면 크기 1440×900 / 1024×768 / 390×844 | 레이아웃 CSS 작성(≥1024 이단, 768~1023·<768 텍스트→Stage), 시각 확인 미검증 |
| 접근성 | H1/CTA/키보드 패드 Tab 접근, Stage aria-hidden + 숨은 장면 텍스트 제공, reduced-motion 시 lerp·왜곡·확장 애니메이션 생략. 대비 수동 확인 필요 |
| 성능 측정 | 미측정(기록할 값 없음) |
| 빌드 | `next build` 미실행(금지). tsc·eslint만 통과 |

## 알려진 제약
- 터치 드래그 모드는 Stage에서 `touch-action:none`(Stage 위 세로 스크롤 불가). 스크롤 필요 시 ‘탭 Toggle’ 선택.
- 키보드 패드 포커스 링은 히어로 전체 영역에 표시된다.
- 속도 왜곡은 축 정렬 타원(회전 없음).
