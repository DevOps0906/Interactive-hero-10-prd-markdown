# QA 체크리스트 — Legal Case Journey

정적 검증: `npx tsc --noEmit`(이 폴더 오류 0, 타 폴더 기존 오류 2건), `npx eslint`(통과). 런타임은 build/dev 금지 규칙으로 실행하지 못했다.

| 항목 | 결과 | 근거 |
|---|---|---|
| 첫 로드에서 CTA 즉시 보이고 3D 실패 시 포스터/폼 유지 | 코드상 충족 / 런타임 미검증 | CTA는 HeroSlot `cta`(HTML). WebGL 미지원·컨텍스트 손실·8초 타임아웃 시 포스터 + 패널·폼 유지 |
| 선택 컨트롤에 읽을 수 있는 텍스트 상태 | 코드상 충족 / 미검증 | aria-pressed/aria-current + "(선택됨)(현재 단계)" sr 텍스트 + role=status 상태줄 |
| 드래그·스크롤 터치 충돌 없음 | 코드상 충족 / 미검증 | 드래그 조작 없음, 캔버스·스테이지 `touch-action: pan-y`, 휠 줌 없음 |
| 포커스 복귀·ESC/닫기·키보드 | 코드상 충족 / 미검증 | 서류 설명 Esc/닫기 후 트리거 버튼으로 포커스 복귀. 3D는 aria-hidden, 모든 기능이 HTML 컨트롤로 가능 |
| 열고 닫아도 RAF/리스너/Geometry 누수 없음 | 코드상 충족 / 미검증 | gsap.context kill, 데드라인 clearTimeout, TubeGeometry dispose, IO/visibility/popstate/keydown 해제, R3F 언마운트 dispose |
| 불확실 수치·법적 주장에 데모 표시 | 충족(코드) | DEMO 라벨, 기간·비용 "데모 예시", 법률 결과 보장 없음 고지 |
| 데스크톱·모바일에서 CTA→폼 제출→확인 흐름 | 미검증 | CTA는 폼으로 스크롤·포커스, 검증 후 데모 확인 상태(전송·저장 없음) |
| 인터랙션 1~7 | 구현 / 미검증 | 1 선택기, 2 카드 스택+설명, 3 GSAP 카메라, 4 선행 연결선, 5 체크리스트, 6 최소 수집 폼, 7 면책 문구 |
| E2E-02 뒤로가기 일치 | 코드상 충족 / 미검증 | `#service=` 해시 pushState + popstate, 3D·패널이 같은 상태에서 렌더 |
| E2E-03 모션 감소 | 코드상 충족 / 미검증 | duration 0, frameloop demand + invalidate |
| 반응형 1440/1024/768/390 | 미검증 | 패널 3열(1200~)/2열(768~)/1열 + 모바일 sticky 바텀시트 |
| 화면 밖·탭 숨김 렌더 중단, DPR 상한, 품질 자동 하향 | 코드상 충족 / 미검증 | IO+visibilitychange → frameloop never, clampDpr, downgradeTier |
| LCP/CLS·FPS 실측 | 미검증 | 측정 불가 |
