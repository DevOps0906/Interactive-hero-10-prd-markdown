# Architecture Blueprint Reveal (건축사·설계사무소)

PRD: `Hero_Industry_PRD/01_architecture_building_reveal_PRD.md` · 라우트 `/industry/architecture-building-reveal`
도면 선 그리기 → 3D 건축물 전환 → 층별 탐색 → 상담 문의(데모 폼). 모든 수치·재질·설명은 DEMO 예시다.

## 진행 현황
| 단계 | 상태 |
|---|---|
| P0 자산 계약 | 완료 (아래 "자산 체크리스트") |
| P1 정적 구성(H1·CTA·포스터 폴백·패널) | 완료 |
| P2 3D 기초(조명·카메라 한계·에러/폴백) | 완료 (GLB 로더는 구현, 실제 GLB 파일은 없음) |
| P3 인터랙션 7종 | 구현 완료 / 브라우저 동작은 미검증 |
| P4 업무 전환(CTA·데모 폼·투어 종료 CTA) | 완료 |
| P5 검증 | tsc·eslint 통과, 런타임은 미검증 (QA.md) |
| P6 산출 | 이 문서 + QA.md. 성능 수치·캡처는 미측정 |

## 파일
`ArchitectureBlueprintRevealHero.tsx`(조립·데드라인·가시성) · `useBlueprint.ts`(단일 reducer 상태) · `Scene.tsx`(R3F) · `Blueprint.tsx`(GSAP 선 도면) · `Overlay.tsx`(도구·요약 시트) · `Controls.tsx`(HTML 조작 패널·폼) · `FloorPlan.tsx` · `config.ts` · `types.ts`

## 상태 계약
`selectedId`(FloorId|null) · `viewMode`(iso|front|top|tour) · `config`(material, prevMaterial, compare, time, exploded) · `isAnimating` · 그 외 phase/tourStep/hotspotId. 3D와 HTML은 같은 state에서 렌더한다.

## 모델 교체 가이드
1. GLB 를 `public/models/architecture-building-reveal/` 에 두고 `config.ts` 의 `MODEL_ASSET.url` 을 채운다.
2. 노드 이름: 층 `floor_01 floor_02 floor_03 floor_04 roof`(각 노드의 원점 = 층 하단, 단위 m, Y-up), 외피 메시 `<id>_facade`(재질 팔레트 대상). 창문 발광은 절차적 모델에만 적용(GLB는 `<id>_windows` 재질을 별도 연결 필요).
3. `FLOORS[].y`, `HOTSPOTS[].offset`, `TOUR_STEPS`, 카메라 거리 한계를 실제 크기에 맞춘다. 로드 실패 시 절차적 모델로 대체된다.
4. 실제 평면도는 `FloorPlan.tsx` 를 `public/posters/...` 의 SVG/PNG 로 교체한다.

### 자산 체크리스트
메시 이름 · 단위(m)·축(Y-up) · 층별 원점 · 재질 슬롯(facade) · 폴리곤 수(권장 층당 5만 이하) · 애니메이션 클립 없음 · 라이선스/소유권 확인.

## 제어 옵션
| 컨트롤 | 값 | 위치 |
|---|---|---|
| 층 선택 / 층 분리 | floor_01~04, roof | 패널, 3D 클릭 |
| 재질 / 전후 비교 | 노출 콘크리트·목재 루버·유리 커튼월 | 패널 |
| 주야 조명 | 주간·노을·야간 | 패널 |
| 뷰 | 아이소·정면·상부, 초기 뷰 | 패널·도구 막대 |
| 카메라 투어 | 3장면 + 마지막 문의 CTA, 자동 진행 토글 | 패널·히어로 CTA |
| 핫스팟 | 입구·로비·옥상 → 설명 카드 포커스 | 패널(3D 라벨은 보조) |
| 되돌리기/초기화/도면 다시/전체화면 | — | 스테이지 도구 막대 |

## 완료/미완료
- 완료: 위 인터랙션 7종, 반응형 3구간, 모션 감소 정적 대체, WebGL 실패 포스터 폴백, 데드라인 기반 도면 전환, 화면 밖·탭 숨김 렌더 중단, 품질 자동 하향.
- 미완료/미검증: 실제 GLB, 도면–모델 정합 검증, 브라우저 실행·성능 측정·캡처, 실기기 터치, URL 상태 동기화(뒤로가기는 페이지 이동만).
- 측정 이벤트: `window` `hero:event` CustomEvent(개인정보 제외)로 발행 — analytics adapter 연결 필요.
