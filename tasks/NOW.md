# NOW — Interactive Hero Lab 대시보드

갱신: 2026-11-03

## 결정
- 구조: 좌측 GNB 메뉴 10개(PRD 01~10) + 메뉴별 히어로 섹션
- 스택: Next.js 16.4.4 · React 19.3.1 · Tailwind CSS v4.3.3
- 디자인 기준: `D:/WorkSpace/DEV/nomad-design-modules/_design-guide` (클론, 참고만 — 수정 금지)

## 단계
| 단계 | 담당 | 상태 |
|---|---|---|
| 1. 디자인 토큰·DESIGN.md·미리보기 (`design/`) | designer (sonnet) | 완료 (시안: design/preview.html) |
| 2. 디자인 확정 | 팀장 | 추천값 적용(틸·248/64/288·레일·번호 아이콘·데모 버튼 제거) |
| 3. Next.js 셸: GNB + 10개 라우트 + 히어로 자리 (브랜치 feat/hero-dashboard) | builder | 진행 중 |
| 4. 히어로 10개 병렬 구현 (각 PRD P0~P5, 폴더 분리) | builder ×10 → codex-reviewer | 대기 |

## 남은 일
- `nomad-doctor . --fix` 미실행(자동 모드 차단) → 사용자가 `!`로 직접 실행 필요
