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
| 3. Next.js 셸: GNB + 10개 라우트 + 히어로 자리 (브랜치 feat/hero-dashboard) | builder | 완료 (커밋 57ded19, build·lint·10라우트 200) |
| 4. 히어로 10개 병렬 구현 (각 PRD P0~P5, 폴더 분리) | builder ×10 | 완료 (커밋 76e2bad) |
| 5a. 통합 검증 1차: build·lint 통과, 10라우트 콘솔 오류 0 | 팀장 | 완료 |
| 5b. 런타임 버그 수정: 01 인트로·제목 소실, 10 캔버스 크기, 08·09 모델 어두움 | builder ×3 + 팀장 | 완료 (커밋 0a8eeb8, 브라우저 확인) |
| 5c. 레이아웃 통일: HeroSlot 확장(CTA·패널·스크롤 구간·모바일 순서), 04 터치 기본값 탭 | builder + 팀장 | 완료 (커밋 451d63c, 데스크톱·375·768 확인, 03 잘림·레일 라벨 수정) |
| 5d. 리뷰(Codex 한도 초과 → reviewer 대체) 🟡4건 반영 + 의존성 점검 → 커밋·push | 팀장 | 완료 |
| 6. 해상도별 캡처·fps 실측 → 각 QA.md, 실기기 검수, master 병합 | 사용자 결정 | 대기 |

## 메모
- TypeScript 6.0.3 고정(7.x는 typescript-eslint 미지원)
- 웹폰트: Pretendard 1.3.9(npm, next/font/local) + JetBrains Mono(next/font/google) 적용 — 미커밋, 통합 빌드 때 확인
- npm audit: 운영 의존성 0건, 개발 의존성 moderate 15건(배포 번들 무관)
- 라이선스: three·R3F·drei MIT, Pretendard OFL-1.1, GSAP는 Standard "No Charge" 라이선스(OSI 아님, 상업 무료)
- 자동화 브라우저 탭은 백그라운드 시 rAF 1.5fps로 스로틀됨 → 인트로는 벽시계 기준 종료 필요

## 남은 일
- `nomad-doctor . --fix` 미실행(자동 모드 차단) → 사용자가 `!`로 직접 실행 필요

## 2차: 전문 히어로섹션 10종 (브랜치 feat/industry-heroes)
근거: Hero_Industry_PRD/*.md (P0~P6). 기존 규칙 동일: 폴더 분리 병렬, HeroSlot 슬롯 사용, 팀장 통합 검증(메뉴 클릭 순회 포함).

| 단계 | 담당 | 상태 |
|---|---|---|
| A. PRD README 목록 표 변환 | 팀장 | 완료 |
| B. GNB 탭(히어로섹션/전문 히어로섹션) + /industry/<slug> 10라우트 placeholder | builder | 진행 중 |
| C. 전문 히어로 10개 병렬 구현 (components/industry/<Name>/) | builder ×10 | 대기 |
| D. 통합 검증(build·lint·브라우저 메뉴 순회·콘솔 0) → 리뷰 → 커밋·push | 팀장 | 대기 |
