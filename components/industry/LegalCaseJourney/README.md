# Legal Case Journey (법무사·법률 사무소)

`/industry/legal-case-journey` — 상속등기·부동산등기·법인설립 절차를 3D 장면(절차 4단계 + 서류 카드 스택)으로 이해하고 업무 상담 신청(데모)까지 이어지는 히어로.

## 진행 현황
- 완료: P0 자산 계약(아래), P1 정적 구성·포스터, P2 3D 기초(절차적 모델·조명·폴백), P3 인터랙션 7종, P4 상담 폼(데모), P6 문서.
- 미검증(실행 금지 규칙): P5 마우스·터치·느린 네트워크·WebGL 실패·리사이즈·연타 런타임 테스트, 성능 실측(LCP/CLS/FPS), 캡처. 정적 검사(tsc/eslint)만 수행. 상세는 `QA.md`.
- 미완료: 실제 GLB, 법률전문가 문구 검토, 분석 도구 연결.

## 사용
`<LegalCaseJourneyHero services={adapter} />` — `services` 는 `ServiceData[]` 를 돌려주는 adapter(생략 시 `config.ts` 의 `MOCK_SERVICES`, 데모 데이터). 이벤트(`hero_view/select/interact/cta_click`, `lead_submit`)는 `window` 의 `hero-event` CustomEvent 로 개인정보 없이 발행된다.

## 파일
`LegalCaseJourneyHero.tsx`(조립·품질·가시성) · `Scene.tsx`(R3F 장면) · `Panel.tsx`(HTML 컨트롤·체크리스트·폼) · `useJourneyState.ts`(상태 한 곳) · `config.ts`(데이터·카메라·MODEL_ASSET) · `types.ts`

## P0 자산 계약 / 모델 교체 가이드
- 단위 m, 상향 Y, 원점 바닥 중앙. 단계 노드 4개 x 위치는 `STEP_X`(-3.3, -1.1, 1.1, 3.3).
- 노드 이름: `step-intake|review|submit|done`(아이콘: 파일폴더·문서/돋보기·건물·도장, 각 로컬 원점은 받침 위), 서류 카드는 `doc-<doc.id>`. 재질 슬롯: 본체/포인트(금색). 애니메이션 클립 없음(GSAP로 이동).
- 교체: GLB를 `public/models/legal-case-journey/`에 넣고 `MODEL_ASSET.url` 을 지정. 없는 노드는 절차적 메시로 대체된다. 폴리곤 권장 총 50k 이하. 외부 URL 금지, 라이선스·소유권 확인.
- 법적 문구: 업무 범위 외 법률 상담·대리로 오해되지 않도록 전문가 검토 필요(`LEGAL_NOTICE`).

## 제어 옵션
| 옵션 | 위치 | 동작 |
|---|---|---|
| 상황 선택 | 패널 | 서비스·절차·서류 전환, `#service=` 해시 동기화 |
| 보기 모드 | 패널 | 전체/절차/서류 카메라 |
| 단계·이전/다음 | 패널·3D 클릭 | 카메라 이동 + 선행 연결선 강조 |
| 서류 설명·보유 체크 | 패널·3D 카드 | 설명 열기(Esc 닫기), 준비 현황(참고용) |
| 되돌리기/초기화/전체화면 | 패널 | 선택 이력 20단계 |
| 품질 | 자동 | 코어·메모리 추정 + 프레임 시간 하향, 모션 감소 시 정적 |

## 개인정보
폼은 호칭·연락처·상담 방식만 받으며 전송·저장(localStorage 포함)하지 않는다. 사건 상세는 요구하지 않는다.
