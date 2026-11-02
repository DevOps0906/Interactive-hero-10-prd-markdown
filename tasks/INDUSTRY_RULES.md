# 전문 히어로 구현 공통 규칙 (builder용)

1차 히어로 10종 통합 때 실제로 터진 버그에서 나온 규칙이다. 모두 지킨다.

## 구조
- 쓰기 범위: `components/industry/<Name>/**`, `app/industry/<slug>/page.tsx`, `public/models/<slug>/**`, `public/posters/<slug>/**` 만.
- 공용 파일(`components/shell/**`, `lib/**`, `app/globals.css`, `app/layout.tsx`, `package.json`) 수정 금지. 새 의존성 금지(필요하면 보고만).
- 반드시 `components/shell/HeroSlot.tsx`를 쓴다. 슬롯: `cta`(제목 옆 CTA·상태), `overlay`(스테이지 위 비장식 UI), `panel`(섹션 아래 설정·폼), `scroll`(sticky 구간 뷰포트 수), `extra`. 3D/효과는 `children`(aria-hidden 스테이지). H1·설명·CTA·폼은 HTML.
- `:global(.hero…)` 덮어쓰기·절대배치 우회 금지. 색은 `--color-*` 토큰, 필요 시 래퍼에 `--hero-bg/fg/accent`.
- 데이터는 `getIndustryHero("<slug>")`(lib/hero/registry.ts) 사용.

## 3D·애니메이션 함정
- R3F `<shaderMaterial>`: `uniforms`를 prop으로 넘기지 말고 `args={[{ uniforms, vertexShader, fragmentShader }]}`로 넘긴다(prop은 복사돼 매 프레임 갱신이 반영 안 됨).
- DOM을 바꾸는 라이브러리(GSAP ScrollTrigger `pin` 등) 정리는 `useLayoutEffect` 또는 `useGSAP`에서 한다. `useEffect` 정리는 React DOM 제거보다 늦어 메뉴 이동 시 removeChild로 앱 전체가 죽는다. `pin`은 가급적 쓰지 말고 HeroSlot `scroll`(CSS sticky)을 쓴다.
- 인트로는 저프레임(백그라운드 탭 1~2fps)에서도 벽시계 기준으로 반드시 끝나게(setTimeout 데드라인) 하고, H1·CTA를 숨기지 않는다.
- 다크 배경에서 모델이 보이게: 금속성 낮게, 재질 색 #3a4252 이상 밝기, 환경광(drei Environment+Lightformer)·hemisphereLight.
- 실제 GLB가 없으므로 three 기본 지오메트리로 절차적 모델을 만들고 `config.ts`에 GLB 교체 지점(`MODEL_ASSET.url`)을 둔다. 외부 URL 자산 로드 금지.
- 화면 밖·탭 숨김 시 렌더 중단, DPR 상한(`lib/hero/performance.ts` 재사용), reduced-motion 정적 대체, WebGL 실패 시 포스터+HTML 폼 유지.
- 터치: 스테이지에 `touch-action: pan-y` 기본(세로 스크롤 막지 않기). 휠 줌 끔.

## 업무 흐름(CTA·폼)
- 문의/예약/견적 폼은 데모: 전송하지 않고 검증 후 확인 상태 표시. "데모" 표기. 개인정보 저장·전송·localStorage 저장 금지.
- 가격·수치·의료·법률 문구는 "데모 예시" 표시, 실제 효능·법률 판단처럼 단정하지 않는다.

## 검증·보고
- `npx tsc --noEmit`, `npx eslint components/industry/<Name> app/industry/<slug>` 통과.
- `next build`/`next dev` 실행 금지(10명 동시 작업 .next 충돌). git commit 금지.
- PRD 공통 검수 체크리스트를 `components/industry/<Name>/QA.md` 표로(런타임 미검증은 "미검증"). P6 README는 같은 폴더 `README.md`.
- 보고 20줄: 상태 / 변경 파일 / 검증 / 팀장 확인 필요.
