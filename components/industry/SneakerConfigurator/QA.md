# QA — Sneaker Configurator

정적 검증(`tsc --noEmit`, `eslint`)만 실행했다. 브라우저 런타임 항목은 "미검증"이며 `next dev` 후 확인이 필요하다.

| 항목 | 구현 근거 | 상태 |
|---|---|---|
| 첫 로드에서 CTA 즉시 보임, 3D 실패 시 포스터/폼 유지 | CTA 는 HTML(HeroSlot cta), SSR 시 포스터, fallback 시 SVG+다시 시도 | 코드 확인, 런타임 미검증 |
| 선택 컨트롤에 텍스트 상태 | radio + 선택 색/소재 이름·재고·SKU 텍스트, aria-pressed | 코드 확인 |
| 터치 드래그와 스크롤 충돌 없음 | canvas `touch-action: pan-y`, 휠/핀치 줌 끔 | 미검증(실기기) |
| 포커스 복귀·ESC·키보드 | 시트 ESC → 토글 포커스, radio 화살표, 툴바 버튼 | 미검증 |
| 열고 닫기 누수 없음 | 재질·텍스처·지오메트리 dispose, 리스너/IO 해제, setTimeout 정리 | 코드 확인, 프로파일 미검증 |
| 수치·가격·법적 주장에 데모 표시 | 가격/재고/장바구니 "데모 예시", 개인정보 수집 없음 | 코드 확인 |
| 데스크톱·모바일 CTA→선택→상태 흐름 | 담기→알림→장바구니→구매(데모) | 미검증 |
| E2E-01 진입→회전→색상→장바구니 | 인트로 회전, 색 변경, 담기 | 미검증 |
| E2E-02 빠른 변경/복귀 일치 | 단일 reducer, 재질은 config 에서 파생, 연타 시 pending 가드 | 미검증 |
| E2E-03 WebGL 실패·reduced-motion | Boundary·contextlost → fallback, demand 렌더 | 미검증 |
| 반응형 1440/1024/768/390 | 3구간 CSS, 모바일 바텀시트 | 미검증 |
| LCP/CLS, 60fps | 포스터 선로딩 없음(img), 프레임 모니터로 품질 하향 | 미측정 |
| GLB 교체 경로 | `MODEL_ASSET.url`, 노드 누락 시 절차적 대체 | 미검증(GLB 없음) |
