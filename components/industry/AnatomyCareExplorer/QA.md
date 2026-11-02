# Anatomy Care Explorer — QA (PRD 공통 검수 체크리스트)

검증 범위: `npx tsc --noEmit`, eslint, 코드 검토. 브라우저 실행(next dev/build 금지)·실기기·성능 측정은 **미검증**.

| 항목 | 구현 근거 | 결과 |
|---|---|---|
| 첫 로드에서 CTA 즉시 노출, 3D 실패 시 포스터/폼 유지 | HeroSlot `cta`(SSR HTML), 로딩 8초 데드라인·Boundary·컨텍스트 손실 → `fallback`(포스터 + 패널) | 코드 구현 / 브라우저 미검증 |
| 선택 컨트롤의 읽을 수 있는 텍스트 상태 | 부위 버튼 "선택됨/선택 안 됨"+`aria-pressed`, 현재 보기, 투명도 `<output>`, CTA 옆 `role=status` | 코드 구현 / 미검증 |
| 터치 드래그·스크롤 충돌 없음 | 캔버스·OrbitControls `touch-action: pan-y`, 팬/휠 줌 끔 | 코드 구현 / 실기기 미검증 |
| 포커스 복귀·ESC/닫기·키보드 | ESC로 선택 해제 후 부위 버튼에 포커스 복귀, 시트 닫기 버튼, 모든 조작은 HTML 버튼·슬라이더 | 코드 구현 / 미검증 |
| RAF/리스너/Geometry/Material 누수 없음 | 재질 `dispose`, JSX 지오메트리 R3F 자동 해제, gsap `kill`·setTimeout `clear`, 리스너 cleanup, 화면 밖·탭 숨김 시 `frameloop="never"` | 코드 구현 / 누수 미검증 |
| 불확실한 수치·의료 주장에 데모 표시 | `DEMO_NOTICE`·`MEDICAL_DISCLAIMER`, 의료진·시간대 "(데모)", 진단·치료 효과 단정 없음 | 충족(문구 검토) |
| CTA 제출·선택·상태 흐름 끝까지 | 부위 선택 → 일반 설명/진료 흐름/검진 안내 → 의료진(데모) → 시간대 → "예약 페이지로 이동(데모)" 확인 상태. 개인정보 입력·저장·전송 없음 | 코드 구현 / E2E 미검증 |
| 핵심 인터랙션 1 Region Picking | `Scene.tsx` `region-<id>` 마커 히트 영역, 패널과 동일 `mockRegions` | 코드 구현 / 미검증 |
| 2 Layer Transparency | `useExplorer` layers, 프리셋 4종+슬라이더 3개, 재질 opacity damp | 코드 구현 / 미검증 |
| 3 Camera Focus | gsap 타임라인 + 벽시계 타이머, min/maxDistance·극각 제한 | 코드 구현 / 미검증 |
| 4 Neutral Motion Demo | 어깨 외전·무릎 굴곡 일반 동작, reduced-motion이면 정지 자세 | 코드 구현 / 미검증 |
| 5 Education Cards / 6 Accessible Selector | `Controls.tsx` 카드·부위 목록(3D 없이 동일 내용) | 코드 구현 / 미검증 |
| 7 Appointment Handoff | 진료과 코드만 전달(`handoffUrl`), 증상·민감정보 미수집 | 코드 구현 / 미검증 |
| E2E-02 빠른 선택/뒤로가기 | 해시 `#region=<id>` pushState + popstate 동기화, 트윈 cancel 후 마지막 목표 유지 | 코드 구현 / 미검증 |
| E2E-03 WebGL 비지원·모션 감소 | Boundary→fallback, `prefersReducedMotion` 즉시 이동·정지 자세 | 코드 구현 / 미검증 |
| 측정 이벤트 | `track()` → `window` CustomEvent `hero:event`(개인정보 제외) | 코드 구현 |
| 실기기 검수 근거(캡처·fps) | — | **미검증** (1440/1024/768/390) |
| `npx tsc --noEmit` | 오류 0 | 통과 |
| eslint (이 폴더 + 라우트) | 오류 0 | 통과 |
