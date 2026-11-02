# 10. Cursor Constellation — 인터랙티브 히어로 개발 PRD

> 문서 유형: 독립 실행 가능한 **개발 기획·작업 지시서** (코드 아님)  
> 목적: Claude Code / Codex CLI에 파일을 전달해 실제 동작하는 Hero 데모 구현  
> 완료 상태: 사전 기획 / 구현 전  
> 버전: 1.0 · 2026-11-03

## 1. 프로젝트 정의

- **프로젝트명:** Cursor Constellation
- **연출 주제:** 캔버스 입자·근접 간선·커서 궤적
- **사용자 경험 목표:** 커서 이동으로 우주 별자리가 연결되고 클릭하면 폭발, 브랜드 문양으로 재집결한다.
- **벤치마킹:** Codrops https://tympanus.net/codrops/ (직접 복제 금지. 연출 원리만 참고)
- **주요 기술:** Canvas 2D 또는 Three.js Points, React, GSAP optional
- **결과물:** `/heroes/cursor-constellation` 독립 라우트, 전체 화면 Hero, 모바일 대응, 설정 패널, README, 스크린샷, 검수 결과
- **필수 UX:** 명확한 H1, 1개 CTA, 첫 1초 이내 반응성 있는 로딩 표시, 키보드 사용 가능한 조작, 핵심 내용을 읽을 수 있는 폴백

## 2. 타깃 화면·디자인 명세

- **디자인 톤:** 어두운 배경(#080B12), 절제된 채도, 강한 대비의 타이포, 다크 프리미엄 테크 느낌. 브랜드 토큰 교체 가능.
- **레이아웃:** 상단 브랜드/내비게이션; 중앙 또는 우측 인터랙티브 Stage(뷰포트의 55~75%); 좌측 H1·설명·CTA; 하단 조작 가이드·스크롤 힌트.
- **반응형:** 데스크톱 ≥1024px 이단 구성; 태블릿 768~1023px 축소 구성; 모바일 <768px 단일 컬럼으로 텍스트 먼저, 캔버스 다음.
- **상태:** loading → intro → idle → interacting → transitioning → error/fallback. 동시 상태 충돌을 방지한다.
- **디자인 토큰:** `--hero-bg`, `--hero-fg`, `--hero-accent`, `--hero-speed`, `--hero-intensity`; 화면 설정에서 조절 가능하도록 기획.

## 3. 핵심 인터랙션 상세 요구사항

1. **인터랙션 1:** 뷰포트 기반 균일/랜덤 입자 초기화와 좌표·속도 관리
2. **인터랙션 2:** 포인터-입자 거리에 따른 attraction/repulsion 가속도 적용
3. **인터랙션 3:** 근접 거리 기반 edge 연결과 alpha fade
4. **인터랙션 4:** 포인터 속도 기반 파티클 trail 생성·수명 관리
5. **인터랙션 5:** click burst 힘과 마찰/감쇠 적용
6. **인터랙션 6:** 오프스크린 텍스트 샘플링으로 입자 목표 좌표 생성 및 전환
7. **인터랙션 7:** uniform grid 근접 탐색, DPR cap, visibility pause, 모바일 감소

## 4. 기술 아키텍처 및 파일 경로

- `app/heroes/cursor-constellation/page.tsx`: 서버 페이지; SEO 메타정보, 설명 및 데모 마운트
- `components/heroes/CursorConstellation/CursorConstellationHero.tsx`: 클라이언트 히어로 컴포넌트
- `components/heroes/CursorConstellation/Scene.tsx`: Three/Canvas 또는 DOM Stage 구현
- `components/heroes/CursorConstellation/Controls.tsx`: 사용자 조절 패널과 도움말
- `components/heroes/CursorConstellation/useHeroInteraction.ts`: 입력 좌표·이벤트·애니메이션 상태 관리
- `components/heroes/CursorConstellation/config.ts`: 타입이 있는 기본 옵션·성능 프리셋
- `lib/hero/performance.ts`: 공통 품질 자동 조절·DPR·모션 감소 유틸
- `public/heroes/cursor-constellation/`: 필요한 모델·이미지·텍스처·대체 스틸 이미지

**기준 스택:** Next.js App Router + React + TypeScript + Tailwind CSS. 3D는 R3F/Three.js, DOM 모션은 GSAP 사용. **최신 호환 버전은 구현 시 공식 문서를 확인하여 고정한다.** 추가 의존성은 최소화한다.

## 5. 구현 순서 (필수 작업 단위)

1. **P0 — 환경:** 패키지·라우팅·정적 텍스트 Hero 생성, 3100 포트 실행 확인.
2. **P1 — 베이스 Stage:** Stage 표시, 리사이즈 대응, 접근 가능한 폴백 UI와 오류 처리.
3. **P2 — 핵심 효과:** 아래 1~3번 인터랙션을 먼저 동작시키고 상태 충돌 검증.
4. **P3 — 고급 연출:** 아래 4~6번 인터랙션과 인트로/전환 타임라인 통합.
5. **P4 — 성능·접근성:** 7번 최적화, 모바일/키보드/모션 감소/자원 해제.
6. **P5 — 제품화:** 옵션 패널, 데모 설명, README, 실행 캡처 및 QA 표 작성.

## 6. 개발 검수 시나리오

- **진입:** 새로고침 시 JavaScript 오류 없이 콘텐츠가 보이고 이펙트가 시작된다.
- **조작:** 마우스 이동·드래그·클릭을 연속 반복해도 제어가 꼬이지 않는다.
- **화면 크기:** 1440×900, 1024×768, 390×844 크기로 겹침·잘림을 확인한다.
- **접근성:** H1/CTA 키보드 접근, 대비와 `prefers-reduced-motion`, 대체 텍스트 콘텐츠를 확인한다.
- **성능:** 데스크톱 60fps 목표(보장 아님), 모바일 30fps 이상을 초기 목표로 측정한다. 측정 장비·장면·입자 수와 프레임 값을 README에 기록한다.
- **회복성:** 탭 비활성화→복귀, 리사이즈, 페이지 이동→재진입 시 메모리·이벤트 리스너 누수 확인.
- **빌드:** `npm run build`, 타입 검사, lint(프로젝트 설정 시), 콘솔 오류 확인.

## 7. 완료 정의(Definition of Done)

- 7가지 인터랙션을 각기 시연할 수 있다.
- 타이틀과 CTA가 효과 미지원 장치에서도 정상 표시된다.
- 환경에 따라 품질이 하향 조정되고, 렌더링 중단/컴포넌트 unmount 시 GPU와 타이머 자원이 정리된다.
- 실제 데스크톱·모바일에서 핵심 기능 확인 및 검수 근거(캡처/영상/로그)를 남긴다.
- 벤치마킹 사이트의 소스코드나 디자인 자산을 무단 복사하지 않는다.

## 8. 주의사항 및 범위 제외

- 근접선 계산의 O(n²) 병목을 공간 분할로 해결한다.
- 로그인·결제·CMS 연결은 MVP 범위에서 제외. 향후 외부 데이터 주입 가능한 props 계약을 유지한다.
- 실측 성능과 개발 시간은 구현 전 확정할 수 없으므로 확인된 값만 문서화한다.

## 9. Claude Code / Codex CLI 작업 지시문 (복사해서 사용)

> 현재 저장소의 이 PRD를 기준으로 **Cursor Constellation** 히어로를 실제 동작하도록 구현하라. 먼저 저장소/패키지 구조를 검사하고 계획 및 수정 파일 목록을 보고하라. P0→P5 순서대로 구현하고 각 단계 후 빌드 또는 자동 테스트를 수행하라. 본문 7개 핵심 인터랙션은 생략하지 말고 각 기능을 데모 UI에서 사용자가 직접 검증 가능하게 하라. 새 의존성을 도입하기 전 이유와 버전 호환성을 확인하라. 초기 로딩, 성능 프로파일, 모바일, 키보드 및 reduced-motion 폴백을 구현하라. 끝나면 실행 명령, 테스트 결과, 미해결 이슈를 README에 정리하라.

## 10. 실행 및 전달 결과 형식

- 설치: `npm install`
- 실행: `npm run dev -- --port 3100` (프로젝트 설정에 따라 CLI 옵션 검증)
- 결과 보고: 구현 기능표 / URL / 실행 캡처 / 성능 측정값 / 알려진 제약 / 다음 단계
