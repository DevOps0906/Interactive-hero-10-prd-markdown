# Fashion Avatar Lookbook (05 / fashion-avatar-tryon)

의류 쇼핑몰용 3D 아바타 룩북 히어로. 라우트 `/industry/fashion-avatar-tryon`. 가격·SKU·실측은 모두 **DEMO mockData**다.

## 구성
| 파일 | 역할 |
|---|---|
| `FashionAvatarLookbookHero.tsx` | HeroSlot 조립(CTA·오버레이·패널), 포스터/폴백, 장바구니 데모 상태 |
| `useLookbook.ts` | 단일 상태(reducer): selectedId·look(config)·viewMode·isAnimating·history |
| `Scene.tsx` | R3F 장면(동적 로드). 절차적 아바타·의류, GSAP 카메라 샷, 드래그 회전, 품질 자동 하향 |
| `Controls.tsx` | HTML 패널: 의상·스와치·카메라·사이즈 가이드(dialog)·Shop the Look·모바일 바텀시트 |
| `Overlay.tsx` | 스테이지 위 상태 칩·샷/회전/전체화면 툴바 |
| `config.ts` · `types.ts` | mockData(ITEMS)·카메라 샷·사이즈표·`MODEL_ASSET`(GLB 교체 지점) |
| `analytics.ts` | `hero_view/interact/select/cta_click` 이벤트를 `window` CustomEvent(`hero:event`)로만 발행(전송·저장 없음) |

## 제어 옵션
| 옵션 | 위치 | 설명 |
|---|---|---|
| 상의/하의/아우터 | 패널 | 아이템 교체(아우터는 "착용 안 함" 가능), 불투명도 등장 연출 |
| 원단·색상 스와치 | 패널 | 색 트윈, SKU 접미사·가격 가산 반영 |
| 카메라 샷 전신/상체/디테일 | 패널·툴바 | GSAP 프리셋 전환 |
| 회전 ±45°/앞/뒤, 드래그 | 패널·툴바·캔버스 | 터치는 세로 스크롤 우선(`touch-action: pan-y`) |
| 턴테이블 · 천 움직임 근사 | 패널 | 천 움직임은 리깅 흔들림 근사이며 실제 시뮬레이션이 아니다 |
| 되돌리기 · 초기화 · 전체화면 | 패널·툴바 | 되돌리기 최대 20단계 |
| 사이즈 가이드 | 패널 | `<dialog>`(ESC 닫기·포커스 복귀), 정확한 핏 보증 아님 고지 |
| Shop the Look | 패널·CTA·바텀시트 | SKU·가격·합계, 장바구니는 데모 확인 상태만(저장·전송 없음) |

## 모델 교체 가이드
1. GLB(glTF 2.0)를 `public/models/fashion-avatar-tryon/`에 두고 `config.ts`의 `MODEL_ASSET.url`에 경로를 넣는다(외부 URL 금지).
2. **자산 체크리스트**(누락 시 개발 콘솔에 `GLB 노드 누락` 경고, `Scene.tsx`의 `missingNodes`):
   - 노드 이름: 아바타 `Avatar_Neutral`, 의류 `Top_Tee/Top_Shirt/Top_Knit`, `Bottom_Jeans/Bottom_Chino/Bottom_Skirt`, `Outer_Blazer/Outer_Coat`
   - 단위 m, Y-up, 발 바닥 y=0, 전신 높이 약 1.8, 앞면 +Z
   - 의류별 재질 슬롯 1개(색은 코드가 슬롯 재질로 덮어쓴다), 아바타 체형은 중립
   - 리깅·Idle 클립이 있어도 현재는 사용하지 않음(AnimationMixer 연결은 미구현)
   - 라이선스·소유권 문서화
3. 아이템 추가/가격 변경은 `config.ts`의 `ITEMS`. 실서비스에서는 별도 adapter로 주입한다.

## 완료 / 미완료
- 완료: P0 자산 계약(위 표) · P1 포스터/HTML 구조 · P2 조명/카메라/로딩·에러·폴백 · P3 인터랙션 7종 · P4 CTA·바텀시트·저사양 폴백 · QA 표
- 미완료: 실제 GLB 자산, GLB 리깅 클립 재생, 실제 천 시뮬레이션(범위 외), 런타임 성능 측정·캡처(미검증), 카메라/사진 업로드 기능은 개인정보 이유로 **의도적으로 제외**
- 성능 측정 결과: **미검증** (이 작업에서는 `next dev/build` 금지로 브라우저 실행을 하지 못했다)

## 주의
- 아바타는 중립 체형이며 사용자 신체 치수를 추정하지 않는다. 3D 시착은 실제 핏을 보장하지 않는다.
