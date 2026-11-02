# QA — Fashion Avatar Lookbook

런타임(브라우저) 실행은 하지 못했다. 정적 검증(tsc, eslint)만 통과했고 나머지는 코드 리뷰 기준이다.

| 항목 | 상태 | 근거 |
|---|---|---|
| tsc / eslint | 통과 | `npx tsc --noEmit`, `npx eslint components/industry/FashionAvatarLookbook app/industry/fashion-avatar-tryon` |
| 첫 로드에서 CTA 즉시 노출, 3D 실패 시 포스터/폼 유지 | 코드상 충족 / 런타임 미검증 | CTA·패널은 HTML(HeroSlot cta/panel), Boundary·webglcontextlost → fallback 포스터 |
| 선택 컨트롤의 텍스트 상태 | 코드상 충족 | `aria-pressed` + "선택됨"/"켜짐·꺼짐" 텍스트, `role=status` 요약 |
| 터치 드래그와 페이지 스크롤 충돌 없음 | 코드상 충족 / 미검증 | 캔버스 `touch-action: pan-y`, 휠 줌 없음 |
| 포커스 복귀·ESC·키보드 | 코드상 충족 / 미검증 | `<dialog>` showModal(ESC)·onClose 포커스 복귀, 모든 조작이 버튼 |
| 반복 열기/닫기 누수 없음 | 코드상 충족 / 미검증 | 재질 dispose, 리스너·gsap 정리, 프레임 루프 off(화면 밖·탭 숨김), 전체화면 해제 |
| 불확실 수치에 데모 표시 | 충족 | DEMO 배지/문구, 가격·SKU·실측 mockData |
| CTA 제출·선택·상태 저장 흐름 | 부분 | 장바구니는 데모 확인 상태만(저장·전송 없음). 데스크톱/모바일 E2E 미검증 |
| E2E-01 (첫 화면→의상 변경→360도→상품 선택→CTA) | 미검증 | |
| E2E-02 (빠른 변경 시 상태-3D 일치) | 코드상 충족 / 미검증 | 3D가 reducer 상태에서 직접 렌더, 애니메이션은 시각 효과만 |
| E2E-03 (WebGL 불가·모션 감소) | 코드상 충족 / 미검증 | fallback 포스터, reduced 시 트윈 0·자동회전 off |
| 반응형 1440/1024/768/390 | 미검증 | 구간별 폰트 토큰·바텀시트(~767) CSS 작성 |
| LCP/CLS·FPS 측정 | 미검증 | |
