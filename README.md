# Interactive Hero Lab — 10개 독립 PRD

각 PRD는 독립적으로 복사해 Claude Code / Codex에 전달해 사용할 수 있습니다. 코드가 아닌 기획·구현 계약 문서입니다.

| No | 히어로 | 핵심 기술 |
|---|---|---|
| 01 | [Particle Universe](Hero_PRD/01_particle-universe_PRD.md) | 입자 구·형태 변환·GPU 셰이더 |
| 02 | [Knowledge Galaxy](Hero_PRD/02_knowledge-galaxy_PRD.md) | 3D 지식 그래프·선택·라벨 |
| 03 | [Magnetic Typography](Hero_PRD/03_magnetic-typography_PRD.md) | 마그네틱 텍스트·가변 폰트 |
| 04 | [Spotlight Reveal](Hero_PRD/04_spotlight-reveal_PRD.md) | 이중 레이어·커서 마스크 |
| 05 | [Depth Parallax](Hero_PRD/05_depth-parallax_PRD.md) | 다층 원근·스크롤 카메라 |
| 06 | [Kinetic Type](Hero_PRD/06_kinetic-type_PRD.md) | 마키·가변 폰트·스크롤 연동 |
| 07 | [Liquid Morphing](Hero_PRD/07_liquid-morphing_PRD.md) | 메타볼·노이즈·굴절 소재 |
| 08 | [3D Product Experience](Hero_PRD/08_3d-product-experience_PRD.md) | 제품 GLB·핫스팟·구성 변경 |
| 09 | [Scroll Storytelling](Hero_PRD/09_scroll-storytelling_PRD.md) | Pin·Scrub·3D 카메라 스토리 |
| 10 | [Cursor Constellation](Hero_PRD/10_cursor-constellation_PRD.md) | 캔버스 입자·근접 간선·커서 궤적 |

## 시작 방법

1. 각 PRD를 프로젝트 루트에 복사하거나 해당 경로를 에이전트에게 제시합니다.
2. 한 번에 하나씩 P0~P5 순서로 구현·테스트합니다.
3. 공통 프리뷰 갤러리와 옵션 스키마는 개별 데모가 안정화된 뒤 결합합니다.
4. 외부 사이트는 영감·기술 참조용이며 동일 소스/이미지/애니메이션의 복제 지시가 아닙니다.

## 진행 현황

| 항목 | 상태 |
|---|---|
| 셸: Next.js 16.4.4 · React 19.3.1 · Tailwind CSS 4.3.3, GNB(데스크톱 펼침/접힘 · 태블릿 레일 · 모바일 드로어), 테마 전환 | 완료 |
| 웹폰트: Pretendard 1.3.9 · JetBrains Mono | 완료 |
| 히어로 01~10 효과 구현 (PRD P0~P5 코드) | 완료 |
| 공통 배치: ≥1024 글 좌 / 스테이지 우, 1023 이하 글 → 스테이지 → 패널 | 완료 |
| 데스크톱 브라우저 확인 (10개 콘솔 오류 0) | 완료 |
| 해상도별 캡처 · fps 실측을 각 `components/heroes/*/QA.md`에 기록 | 남음 |
| 실기기(모바일) 검수 | 남음 |

- 실행: `npm install` → `npm run dev` (http://localhost:3100)
- 브랜치: `feat/hero-dashboard`

## 콘텐츠 바로가기

| 구분 | 경로 |
|---|---|
| PRD 10종 | [`Hero_PRD/`](Hero_PRD/) |
| 디자인 시스템 | [`design/DESIGN.md`](design/DESIGN.md) · [`design/tokens.css`](design/tokens.css) · [`design/preview.html`](design/preview.html) |
| 히어로 구현 · QA | [`components/heroes/`](components/heroes/) (폴더별 `QA.md`) |
| 공용 셸 · 히어로 슬롯 | [`components/shell/`](components/shell/) · [`lib/hero/`](lib/hero/) |
| 진행 상태 | [`tasks/NOW.md`](tasks/NOW.md) |
