# ProductExperience3D

라우트 `/heroes/3d-product-experience` (R3F 9 + drei 10 + three 0.187 + GSAP 3.15).

- `ProductExperience3DHero.tsx` 히어로(+ `product` props로 제품 데이터 주입)
- `Scene.tsx` Canvas·모델·핫스팟·인트로·exploded·품질 모니터
- `Controls.tsx` 옵션 패널(색상·소재·부품 스펙·시점·성능·속도/강도) — 키보드/스크린리더 경로
- `useHeroInteraction.ts` 상태 머신(loading→intro→idle→interacting→transitioning→fallback)
- `config.ts` 제품 데이터·품질 프리셋·카메라. **GLB 교체: `MODEL_ASSET.url`** (노드명은 `PartSpec.node`)

실행: `npm run dev` (포트 3100). 성능 측정값(장비·장면·fps)은 미측정 — 패널의 fps 표시로 측정해 여기에 기록한다.
알려진 제약: GLB·HDR 자산 없음(절차적 모델, Lightformer 환경), 실기기 검수 전. 결과표는 `QA.md`.
