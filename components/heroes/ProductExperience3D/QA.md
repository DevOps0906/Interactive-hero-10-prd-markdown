# 3D Product Experience — QA (PRD 7장 DoD)

검증 범위: 정적 검사(tsc·eslint)와 코드 검토만 수행. 브라우저 실행(next dev/build 금지 조건)과 실기기 확인은 **미검증**이며, 아래 "근거"는 구현 위치다.

| DoD 항목 | 구현 근거 | 결과 |
|---|---|---|
| 인터랙션 1 모델 로드·fallback·loading | `Scene.tsx` GlbModel/ProceduralModel + Boundary, Hero의 loading 오버레이·poster.svg 폴백 | 코드 구현 / 브라우저 미검증 |
| 인터랙션 2 OrbitControls 제한·터치 구분 | `Scene.tsx` pan 금지, 극각·거리 제한, canvas `touch-action: pan-y` | 코드 구현 / 실기기 미검증 |
| 인터랙션 3 색상·roughness·metalness | `Controls.tsx` 스와치·슬라이더 ↔ `config.ts` ProductData(SKU·가격), GSAP 전환 | 코드 구현 / 미검증 |
| 인터랙션 4 핫스팟·스펙 패널 | `Scene.tsx` Hotspot(법선·시선 내적으로 뒷면 숨김), `Controls.tsx` 부품 목록·aria-live 스펙 | 코드 구현 / 미검증 |
| 인터랙션 5 GSAP 인트로 | `Scene.tsx` introActive 타임라인(카메라·모델 회전·광원), reduced-motion이면 즉시 최종값 | 코드 구현 / 미검증 |
| 인터랙션 6 exploded view | `config.ts` parts.explode, `Scene.tsx` explode.t 트윈(복귀 시 t=0으로 원위치), CTA 버튼 | 코드 구현 / 미검증 |
| 인터랙션 7 HDR·LOD·모바일 저품질 | `config.ts` QUALITY_PRESETS(segments·DPR·env·shadow), 모바일 ~767 low, 프레임 모니터 자동 하향 | 코드 구현 / 미검증 (HDR 파일 대신 Lightformer 환경) |
| 효과 미지원 시 타이틀·CTA 정상 | HeroSlot H1 SSR, CTA·패널은 DOM, WebGL 실패 시 phase=fallback + 정지 이미지 | 코드 구현 / WebGL 비활성 미검증 |
| 품질 하향·unmount 자원 정리 | `downgradeTier`, R3F 자동 dispose, finishMat.dispose, gsap tween kill/context.kill, 컨텍스트 손실 핸들러 | 코드 구현 / 누수 미검증 |
| 상태 충돌 방지 | `useHeroInteraction.ts` reducer: transitioning/intro 중 옵션 액션 무시, 버튼 disabled | 코드 구현 |
| 실기기 검수 근거(캡처·fps) | — | **미검증** (측정 필요: 1440×900, 1024×768, 390×844) |
| 무단 복제 금지 | 자체 절차적 지오메트리·자체 문구 | 충족 |
| `npx tsc --noEmit` | 이 폴더 오류 없음. 전체는 `components/heroes/ParticleUniverse/Scene.tsx(148)` 기존 오류 1건(범위 밖) | 부분 |
| eslint (이 폴더 + 라우트) | 오류 0 | 통과 |
