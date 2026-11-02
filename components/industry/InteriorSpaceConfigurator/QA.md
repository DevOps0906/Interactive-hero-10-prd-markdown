# QA — Interior Space Configurator

정적 검증(`npx tsc --noEmit`, `npx eslint`)은 통과. 브라우저 실행(`next dev/build`)은 금지라 런타임 항목은 "미검증"이다.

## PRD 공통 검수 체크리스트

| 항목 | 상태 | 근거 / 비고 |
|---|---|---|
| 첫 로드에서 CTA 즉시 보이고 3D 실패 시 포스터/폼 유지 | 코드 확인, 런타임 미검증 | CTA·H1은 HeroSlot HTML. `phase !== ready`면 poster.svg 표시, `fallback`이면 Scene 미마운트 |
| 선택 컨트롤에 읽을 수 있는 텍스트 상태 | 코드 확인 | 라디오 스와치 `✓`+제목 줄 현재값, `aria-pressed`, "선택 상태" 카드, `role=status` 문구 |
| 터치 드래그/스크롤 충돌 없음 | 미검증 | 스테이지·canvas `touch-action: pan-y`, 줌 비활성, Pan 비활성 |
| 포커스 복귀·ESC·키보드 | 코드 확인, 미검증 | Esc=선택 해제, 이동 패드 화살표 키, CTA 클릭 시 대상 제목 focus. 모달 없음 |
| 열고 닫아도 누수 없음 | 코드 확인, 미검증 | 표면 재질/지오메트리 `dispose`, gsap 트윈 kill, 리스너/Observer 해제, 화면 밖·탭 숨김 시 `frameloop=never` |
| 불확실 수치에 데모 표시 | 확인 | 가격 `DEMO` 배지, 치수 참고용 문구, 채광 연출용 문구, 폼 "데모" |
| 데스크톱·모바일 CTA 제출·선택·저장 흐름 | 미검증 | 폼 검증→확인 상태(전송 없음), 구성 저장/불러오기(localStorage, 구성 JSON만) |

## PRD 시나리오

| ID | 상태 | 비고 |
|---|---|---|
| E2E-01 첫 화면→방→소재→가구→견적→CTA | 미검증 | 코드 경로 구현됨 |
| E2E-02 빠른 변경/되돌리기 일치 | 미검증 | 모든 변경이 단일 reducer `config` 한 곳을 거치고 3D/패널이 같은 상태를 읽음. 연타 시 카메라 트윈은 현재 위치에서 재시작 |
| E2E-03 3D 실패·WebGL 미지원·모션 감소 | 미검증 | Boundary+컨텍스트 손실 → fallback, reduced-motion이면 트윈 0초·즉시 이동 |
| 브라우저 뒤로가기 후 상태 복원 | 미구현 | 구성은 메모리 상태. 복원은 "구성 저장/불러오기" 사용 |

## 인터랙션 7개

| # | 항목 | 상태 |
|---|---|---|
| 1 | Room Orbit + Walkthrough(입구/창가/정면 3지점, 좌우 둘러보기) | 구현, 미검증 |
| 2 | Surface Materials(바닥4·벽4·천장3, PBR 값 트윈) | 구현, 미검증 |
| 3 | Furniture Placement(바닥 Raycast, 버튼 이동, 90° 회전, 겹침 경고) | 구현, 미검증 |
| 4 | Dimension Overlay(HTML 라벨, 참고용 안내) | 구현, 미검증 |
| 5 | Daylight Presets(오전/오후/야간 보간) | 구현, 미검증 |
| 6 | Estimate Summary(기준 단가 + 설치·배송·시공 별도 변수) | 구현 |
| 7 | Save Scene + Quote CTA(JSON 저장/불러오기, 구성 ID·품목을 폼에 표시) | 구현, 미검증 |

## 반응형 / 성능

| 항목 | 상태 |
|---|---|
| 1440/1024/768/390 레이아웃 | 미검증(CSS 3구간 설계: 모바일 1열+바텀시트, 태블릿 2열, 데스크톱 3열) |
| LCP/CLS, 60fps, 메모리 | 미측정 |
