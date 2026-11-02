# Magnetic Typography — QA (PRD 7장 DoD)

검증 범위: 정적 검사(tsc, eslint)만 실행. 브라우저 실행·캡처·fps 측정은 하지 않았다(dev/build 금지 지시) → "미검증".

| DoD 항목 | 구현 위치 | 상태 | 근거/비고 |
|---|---|---|---|
| 7가지 인터랙션 각각 시연 가능 | Controls.tsx 체크박스 7개(기능별 on/off) + 슬라이더 + "탭 반응 시연" 버튼 | 구현·런타임 미검증 | 1 자기장(거리 정규화 n²), 2 stagger 인트로(+재생 버튼), 3 elastic 복귀(spring 토글), 4 wght/wdth 보간(축 프로브·스케일 폴백), 5 버튼/라벨 35%/20% follow, 6 velocity skew(상한 슬라이더), 7 터치 탭 burst |
| 효과 미지원 장치에서 타이틀·CTA 정상 표시 | HeroSlot H1(HTML) + 별도 CTA 버튼, reduced-motion 시 clearProps로 정적 표시, 오류 시 fallback 상태(글자 opacity 1) | 구현·런타임 미검증 | JS 없을 때 장식 글자는 숨김(loading) 이지만 H1·설명은 SSR HTML |
| 품질 하향·자원 정리 | detectQualityTier + downgradeTier(60프레임 평균), TIER_PRESETS; 언마운트 시 리스너·rAF·timeline·delayedCall·ResizeObserver·killTweensOf 해제 | 구현·런타임 미검증 | GPU 미사용(DOM 스테이지) |
| 실제 데스크톱/모바일 검수 근거(캡처·로그) | — | 미완료 | 팀장/tester가 브라우저에서 1440x900, 1024x768, 390x844 확인 필요 |
| 벤치마킹 자산 무단 복사 없음 | 자체 구현 | 통과 | 외부 자산 없음 |

## 검증 로그
- `npx tsc --noEmit` 통과
- `npx eslint components/heroes/MagneticTypography app/heroes/magnetic-typography` 통과

## 알려진 제약
- 전용 가변 폰트 파일을 번들하지 않았다. `--font-sans`(Pretendard Variable)가 설치돼 있어야 wght 축이 동작하며, 아니면 스케일 폴백(상태 표시줄에 wght X).
- CTA는 HeroSlot 구조상 히어로 섹션 아래(설정 패널 위)에 있다. HeroSlot에 CTA 슬롯이 없다.
- 성능 수치(fps)는 패널에 실시간 표시되나 README용 측정값은 미기록.
