# Dental Procedure Explorer — QA (PRD 공통 검수 체크리스트)

검증 범위: `npx tsc --noEmit`, eslint, 코드 검토. 브라우저 실행(next dev/build 금지)·실기기는 **미검증**.

| 항목 | 구현 근거 | 결과 |
|---|---|---|
| 첫 로드에서 CTA 즉시 노출, 3D 실패 시 포스터/폼 유지 | HeroSlot `cta`(SSR HTML), 3D는 `dynamic ssr:false`, `fail` → `phase=fallback` + `poster.svg`, 패널·폼은 DOM | 코드 구현 / WebGL 비활성 미검증 |
| 선택 컨트롤에 읽을 수 있는 텍스트 상태 | `aria-pressed`, `aria-current="step"`, 패널 `role=status` 요약, 요약 카드 | 코드 구현 / 스크린리더 미검증 |
| 드래그와 페이지 스크롤 충돌 없음 | `touch-action: pan-y`(canvasWrap + OrbitControls DOM), 줌·팬 끔 | 코드 구현 / 실기기 미검증 |
| 포커스 복귀·ESC/닫기·키보드 | 치아 번호 버튼(키보드 대안), Esc/닫기 시 `tooth-btn-<id>`로 포커스 복귀 | 코드 구현 / 미검증 |
| 열고 닫기 반복 시 누수 없음 | 재질 `dispose`, gsap `kill`/`context.kill`, IO/visibility 리스너 해제, 컨텍스트 손실 핸들러 | 코드 구현 / 누수 측정 미검증 |
| 수치·효과·가격·법적 주장에 데모 표시 | `DISCLAIMERS`, DEMO 배지, 절차 기간·효과·가격 문구 없음 | 충족 |
| 선택·제출 흐름 끝까지 | 선택→단계→단면→예약 폼 검증→DEMO 확인 상태(전송·저장 없음) | 코드 구현 / E2E 미검증 |
| E2E-01 선택→단계→안내→예약 CTA | Summary CTA·히어로 CTA → `#appointment` 포커스 | 코드 구현 / 미검증 |
| E2E-02 빠른 변경·되돌리기에도 상태 일치 | 단일 reducer(`useExplorer`), 3D와 패널 동일 state, history 스택. 브라우저 뒤로가기(history API)는 Next 라우터 충돌 위험으로 **미구현** | 부분 |
| E2E-03 로딩 실패·WebGL 없음·모션 감소 | Boundary·fallback, reduced-motion 시 트윈 duration 0, 품질 low | 코드 구현 / 미검증 |
| 화면 밖·탭 숨김 렌더 중단, DPR 상한 | `useRunning`(IO+visibilitychange → frameloop never), `clampDpr`·`QUALITY_PRESETS`, 프레임 모니터 자동 하향 | 코드 구현 / 미검증 |
| 반응형 1440/1024/768/390 | 3구간 CSS, 모바일 바텀시트(Summary), 치아 차트 7열 | 미검증 |
| 성능(LCP/CLS/fps) 측정, 캡처 | — | **미검증** |
| `npx tsc --noEmit` | 오류 0 | 통과 |
| eslint (컴포넌트 + 라우트) | 오류 0, 경고 0 | 통과 |
