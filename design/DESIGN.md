# DESIGN — Interactive Hero Lab (대시보드 셸)

스택: Next.js 16.4 · Tailwind CSS v4.3 (`@theme`) · 다크 기본(`<html class="dark">`, 라이트는 클래스 제거).
정답 소스는 `design/tokens.css`. 색·서체·반경 값 표는 `design/DESIGN_TOKENS.md`(design-preview 생성)를 본다. 이 문서는 선택과 규칙만 적는다.
미리보기: `design/preview.html`(GNB + 히어로 자리, 3구간·라이트/다크 전환) · `design/tokens-preview.html`(토큰 표).

## 1. 브리프
- 대상: 10개 인터랙티브 히어로 데모를 하나씩 둘러보는 개발자·디자이너(PRD 01~10).
- 주된 일: 메뉴를 골라 풀블리드 히어로 효과를 체험한다. 읽기·탐색 위주, 하루 한두 번 쓰는 도구.
- 분위기: 조용함 · 어두움 · 정밀함. 셸은 무대 뒤, 히어로가 주인공.
- 피할 것: 보라/핑크 그라디언트, 별 파티클, 크립토 네온(블랙+마젠타·네온그린), 셸의 글로우·장식.

## 2. 선택한 패턴·아키타입
표기: `A · 시각 V-H(#24, #27, #36), 히어로 영역에만. GNB는 시각 없음`

| 항목 | 선택 | 근거 |
|---|---|---|
| 구조 | A 앱 셸 (왼쪽 사이드바 + 페이지 슬롯) | 메뉴 10개 평면 나열(15개 미만이라 허용), 현재 위치 표시·접기·키보드 요구가 A의 필수 요소와 일치 (DASHBOARD_PATTERNS 3장 A) |
| 홈 성격 | "만드는/탐색 도구" 계열: 첫 화면이 곧 히어로 | PATTERNS 5장. 숫자 의사결정(C)·처리할 일(B) 제품이 아님. C·B·D는 쓰지 않음 |
| 시각 | V-H Web3·디지털 굿즈 쇼케이스(3D 오브젝트 히어로)의 "큰 히어로 + 콘텐츠" 구성만 히어로 영역에 | 3D·입자·타이포가 주인공. V-A/B/C/D(트레이딩 문법)는 적합도 "부적합"급이라 배제 (VISUAL 5장) |
| 가져오지 않을 것 | V-H의 카드 그리드·랭킹·장식 / V-I 글로우·그라디언트 | VISUAL 3장 주의("업무용 툴에는 장식 과함"), 6.2("글로우는 앱 셸·사이드바 금지") |
| 빼는 A 요소 | 상단 바(검색·조직 전환·알림·계정), AI 패널, ⌘K | 단일 제품·계정 없음. 모바일 상단 바는 햄버거용으로만 존재 |
| 색 규칙 | 포인트컬러 1개(`--color-primary`, 틸) | 현재 위치·CTA·포커스 링에만 사용. 상승·하락 토큰 불필요(지표 화면 없음) |
| 히어로 영역 | 풀블리드 슬롯만 정의, 효과 구현 없음 | HERO_3D 3장(제목·CTA는 HTML, 캔버스 `aria-hidden`, 토큰 밖 색 금지), MOTION_GSAP 5장(숨김 CSS 금지, transform·opacity만, `--ease-*`/`--dur-*` 토큰) |

## 3. GNB 구성
메뉴 10개 = PRD 01~10, 라벨은 README 목록의 영문명. 행: `[번호(mono) 01~10] [라벨]`. 번호가 레일 모드의 아이콘 역할을 하므로 별도 아이콘 세트가 필요 없다. 하단에 테마 전환.
라우트는 메뉴 1개 = 페이지 1개(`/01-particle-universe` 등, 구현 시 확정), 활성 항목은 `aria-current="page"`.

### 상태 (행 높이 `--size-gnb-item` 40px, 반경 `--radius-control`)
| 상태 | 배경 | 글자 | 부가 표시 |
|---|---|---|---|
| 기본 | 투명 | `--color-text-muted` | — |
| hover | `--color-surface-hover` | `--color-text` | 전환 `--dur-fast` |
| active(현재) | `--color-primary-soft` | `--color-primary`, weight 600 | 왼쪽 3px 막대 + `aria-current`(색만으로 표시하지 않음) |
| focus-visible | 변화 없음 | 변화 없음 | 링 `--ring-width` solid `--color-primary`, offset `--ring-offset` |
| 접힘(레일) | 위 상태 동일 | 번호만 표시 | 라벨은 hover·focus 때 오른쪽 툴팁(`--color-surface`, 테두리). `aria-label`/텍스트는 유지 |

접힘 상태 전환은 `--size-gnb-expanded`(248px) ↔ `--size-gnb-rail`(64px). 접기 상태는 `localStorage`에 유지(A 필수 요소).

## 4. 반응형 3구간
| 구간 | GNB | 동작 |
|---|---|---|
| 모바일 ~767 | 드로어 `--size-gnb-drawer`(288px, 최대 85vw) | 상단 바 `--size-topbar`(56px)의 햄버거로 열기. 열리면 스크림, Esc·스크림·메뉴 선택 시 닫기, 닫힌 동안 `inert`, 열림 시 포커스 이동 |
| 태블릿 768~1199 | 아이콘 레일 64px 고정 | 접기 버튼 없음. 툴팁 라벨 |
| 데스크톱 1200~ | 펼침 248px | 접기 버튼으로 레일 전환 가능 |

- 히어로는 GNB 옆 남은 폭 전체(풀블리드), 높이 `100svh`(모바일은 상단 바 제외). 페이지 가로 스크롤 없음.
- 경계 분기는 한 곳에서(구현: 레이아웃 훅 하나, `matchMedia`). 컴포넌트마다 `innerWidth` 금지.
- 3D 장면 기준 1280px(HERO_3D)은 히어로 구현 단계에서만 쓰고, 셸은 3구간을 따른다.

### 구간별 폰트 토큰
| 토큰 | 모바일 ~767 | 태블릿 768~1199 | 데스크톱 1200~ | 쓰임 |
|---|---|---|---|---|
| `--text-display` | 28px | 36px | 48px | 히어로 제목 |
| `--text-h1` | 24px | 28px | 34px | 페이지 제목 |
| `--text-h2` | 20px | 22px | 26px | 섹션 제목 |
| `--text-body` | 15px | 16px | 16px | 본문·한 줄 설명 |
| `--text-nav` | 15px | 14px | 14px | GNB 라벨 |
| `--text-caption` | 12px | 13px | 13px | 번호·보조 |
서체: 본문 Pretendard Variable(`--font-sans`), 번호·수치 JetBrains Mono(`--font-mono`, tabular).

## 5. 기타 토큰 그룹
- 치수: `--size-gnb-expanded/rail/drawer/item`, `--size-topbar`. 간격 `--spacing: 4px`.
- 모션: `--ease-out`, `--dur-fast`(120ms), `--dur-base`(220ms). `prefers-reduced-motion`이면 `--dur-*`를 0ms로.
- 포커스: `--ring-width`, `--ring-offset`. 대비: `design-preview --check` 통과(라이트·다크 전 짝 ✅).

## 6. 구현 메모 (builder용)
- `design/tokens.css`를 `src/styles/tokens.css`로 이동·import. 컴포넌트에 hex·px 직접 사용 금지.
- 히어로 슬롯 계약: 제목·설명·CTA는 HTML, 캔버스는 `aria-hidden`, 3D 재질·GSAP 색도 토큰만, 저사양·reduced-motion은 정지 이미지(HERO_3D 1·1.1절).
- `preview.html`의 `:root` 토큰 블록은 tokens.css 사본이다. 토큰을 바꾸면 사본을 맞춘다.
