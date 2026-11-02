# Cursor Constellation — QA (PRD 7장 DoD)

검증 범위: 정적 검사만 수행. 브라우저 실행·캡처·FPS 측정은 .next 충돌 방지 지시로 하지 않음(미검증).

| DoD 항목 | 구현 | 검증 |
|---|---|---|
| 7가지 인터랙션 시연 | Controls의 가이드·버튼·슬라이더로 1~7 각각 조작 | tsc/eslint 통과, 브라우저 동작 미검증 |
| 1 입자 초기화 | engine.build() 지터 격자, 밀도 슬라이더·초기화 | 미검증(실행) |
| 2 인력/척력 | engine.step() 포인터 거리 가속도, 라디오로 전환 | 미검증(실행) |
| 3 근접 간선·alpha fade | buildEdges() 거리 비례 4단계 alpha | 미검증(실행) |
| 4 커서 궤적 | trail 링버퍼, 속도 기반 생성·수명 0.8s | 미검증(실행) |
| 5 클릭 폭발·마찰 | engine.burst() 임펄스 + exp 감쇠 | 미검증(실행) |
| 6 텍스트 샘플링 전환 | sampleLogo() 오프스크린 샘플 -> gsap pull 전환 | 미검증(실행) |
| 7 grid·DPR cap·visibility·모바일 감소 | uniform grid(통계에 쌍 검사 수 표시), clampDpr+등급별 DPR 상한, visibilitychange·IntersectionObserver 일시정지, 면적 비례 입자 수, downgradeTier | 미검증(실행) |
| 효과 미지원에서도 H1·CTA 표시 | H1/설명은 HeroSlot HTML, CTA는 앵커, canvas 실패 시 error 상태+fallback.svg | 코드 검토 |
| 품질 하향·자원 정리 | 프레임 평균 22ms 초과 시 등급 하향, unmount 시 RAF·Observer·리스너·gsap 해제 | 코드 검토, 누수 실측 미검증 |
| reduced-motion | useSyncExternalStore로 감지, 루프 없이 정적 렌더(문양 고정은 즉시 수렴) | 미검증(실행) |
| 키보드 | 모든 조작이 버튼·슬라이더·체크박스, 스테이지는 장식(aria-hidden) | 코드 검토 |
| 실기기·캡처·성능 로그 | 없음 | 미수행 (README 제약 참조) |
| 무단 복사 금지 | 자체 구현, Codrops 자산 미사용 | 충족 |
