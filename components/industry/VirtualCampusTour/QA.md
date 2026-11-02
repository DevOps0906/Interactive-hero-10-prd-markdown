# Virtual Campus Tour — QA (PRD 공통 검수 체크리스트)

검증 범위: `tsc`·`eslint` 정적 검사와 코드 검토만. 브라우저 실행·실기기 확인(next dev/build 금지)은 **미검증**.

| 항목 | 구현 근거 | 결과 |
|---|---|---|
| 첫 로드에서 CTA 즉시 노출, 3D 실패 시 포스터/폼 유지 | HeroSlot `cta` SSR, 로딩 8초 데드라인·WebGL 실패 시 phase=fallback + `poster.svg`, 패널은 DOM | 코드 구현 / 브라우저 미검증 |
| 선택 컨트롤에 텍스트 상태 제공 | `aria-pressed`, 상태줄 `role=status`(선택·모드·투어·이동 중), 공간 목록 "선택됨" | 코드 구현 / 스크린리더 미검증 |
| 터치 드래그와 페이지 스크롤 충돌 없음 | canvas `touch-action: pan-y`, 줌·팬 비활성 | 코드 구현 / 실기기 미검증 |
| 포커스 복귀·Esc·닫기·키보드 | Esc로 선택 해제 후 "캠퍼스 전경" 버튼 포커스, 모든 조작이 HTML 버튼/폼, 폼 오류 시 첫 오류 필드 포커스 | 코드 구현 / 미검증 |
| 열고 닫기 누수 없음 | R3F 자동 dispose, 리스너·타이머·IntersectionObserver cleanup, 화면 밖/탭 숨김 렌더 중단, 전체화면 해제 | 코드 구현 / 누수 미측정 |
| 불확실 수치·가격·법적 주장에 데모 표시 | `DEMO` 라벨, 하단 고지(모형≠실제 시설, 성과 수치 미사용) | 충족 |
| 데스크톱·모바일 CTA 제출·선택·상태 흐름 | 예약 폼(공간 선택↔3D 동기, 날짜 오늘~90일·인원 1~10 검증), 전송·저장 없음 | 코드 구현 / 끝까지 실행 미검증 |
| E2E-02 빠른 선택 변경에도 선택=3D 일치 | 단일 reducer `selectedId/shotKey`, 3D·패널이 같은 상태에서 렌더, 마지막 shotKey만 도착 처리 | 코드 구현 / 미검증 |
| E2E-03 로딩 실패·WebGL 미지원·모션 감소 | Boundary·contextlost→fallback, reduced-motion은 카메라 즉시 이동·frameloop demand | 코드 구현 / 미검증 |
| 반응형 1440/1024/768/390 | 모바일 바텀시트, 3구간 CSS | 미검증 |
| 성능(LCP/CLS/fps) | DPR 상한·품질 자동 하향 구현 | **미검증**(측정 필요) |
| `npx tsc --noEmit` | 오류 0 | 통과 |
| `npx eslint components/industry/VirtualCampusTour app/industry/academy-virtual-campus` | 오류 0 | 통과 |
