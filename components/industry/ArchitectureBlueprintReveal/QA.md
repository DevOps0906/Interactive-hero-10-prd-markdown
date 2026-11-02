# Architecture Blueprint Reveal — QA (PRD 공통 검수 체크리스트)

정적 검사(tsc·eslint)와 코드 검토만 수행했다. 브라우저 실행은 금지 조건이라 **미검증**.

| 항목 | 구현 근거 | 결과 |
|---|---|---|
| 첫 로드 CTA 즉시 표시, 3D 실패 시 포스터/폼 유지 | HeroSlot `cta`(HTML), Scene Boundary→`fail`→phase=fallback+poster.svg, 패널 폼은 DOM | 코드 구현 / WebGL 비활성 미검증 |
| 선택 컨트롤의 텍스트 상태 | `Controls.tsx` aria-pressed + "현재 …" aria-live 문구, `Overlay` role=status | 코드 구현 / 스크린리더 미검증 |
| 터치 드래그·스크롤 충돌 없음 | 스테이지·canvas `touch-action: pan-y`, 휠 줌 끔, pan 금지 | 코드 구현 / 실기기 미검증 |
| 포커스 복귀·ESC·키보드 | 핫스팟 선택→시트 포커스, 닫으면 이전 요소 복귀, Esc 닫기/투어 종료, 모든 조작은 패널 버튼 | 코드 구현 / 미검증 |
| 반복 열고 닫기 누수 없음 | gsap tween kill 반환, 재질 dispose, R3F 지오메트리 자동 dispose, 컨텍스트 손실 핸들러, 리스너 cleanup | 코드 구현 / 누수 미측정 |
| 불확실 수치·재질·조명 데모 표시 | DEMO 태그·문구(면적, 재질 note, 조명 note, 도면 라벨) | 충족 |
| 데스크톱·모바일 CTA 제출 흐름 | 데모 폼 검증→확인 상태, 저장·전송 없음, 바텀시트(≤767) | 코드 구현 / 미검증 |
| E2E-01 도면→건축물→층별 탐색→CTA | 데드라인 5.2s 보장, 패널·투어 종료 CTA | 코드 구현 / 미검증 |
| E2E-02 빠른 선택·복귀 일치 | 단일 reducer, 층 오프셋 보간 트윈, 트윈 kill+isAnimating 카운터 | 코드 구현 / 미검증 |
| E2E-03 로딩 실패·WebGL·모션 감소 | Boundary, reduced 시 즉시 완성 상태·트윈 0초 | 코드 구현 / 미검증 |
| 1440/1024/768/390 반응형 | CSS 모듈 3구간 | 미검증 |
| LCP·CLS·fps 측정 | — | **미검증** |
| `npx tsc --noEmit` | 오류 0 | 통과 |
| eslint (폴더+라우트) | 오류 0 | 통과 |
