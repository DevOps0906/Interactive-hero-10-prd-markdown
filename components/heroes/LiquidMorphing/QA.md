# Liquid Morphing QA (PRD 7장 DoD)

검수일 2026-11-03. 정적 검증만 수행(브라우저 실행·`next build/dev`는 .next 충돌 방지 지시로 미실행).

| DoD 항목 | 구현 근거 | 결과 |
|---|---|---|
| 1. 7가지 인터랙션 각각 시연 | Controls 패널 1~7 그룹: (1) 노이즈 Blob (2) SDF 메타볼 토글 (3) 포인터 uniform·펄스 (4) Fresnel/iridescent 강도·색 (5) 스크롤 연동·수동 진행도 슬라이더 (6) GSAP 프리셋·인트로 재생 (7) 품질 select·fps 표시 | 코드 구현 완료 / 브라우저 시연 미검증 |
| 2. 효과 미지원 장치에서 H1·CTA 정상 | H1·설명은 HeroSlot HTML, CTA는 별도 `<a>`. WebGL2 없음·컨텍스트 손실·렌더 예외 → fallback 상태 + `public/heroes/liquid-morphing/fallback.svg`, 재시도 버튼 | 코드 구현 / 미검증 |
| 3. 품질 하향·자원 정리 | `detectQualityTier`+`downgradeTier`(120프레임 단위 평균), 등급별 정점 수·DPR·raymarch 스텝·메타볼 수(`TIER_PRESETS`), reduced-motion은 demand 렌더·정지. unmount 시 ShaderMaterial dispose, GSAP timeline/tween kill, window 리스너·타이머 해제, 탭 숨김 시 frameloop never | 코드 구현 / 누수 실측 미검증 |
| 4. 실제 데스크톱·모바일 근거(캡처/로그) | 없음 | **미수행** (스크린샷·fps 실측 필요) |
| 5. 벤치마킹 사이트 소스·자산 미복사 | 노이즈는 MIT 공개 simplex 구현(출처 주석), 나머지 자체 작성 | 통과 |

## 검증 명령
- `npx tsc --noEmit`: LiquidMorphing 관련 오류 0건. 전체로는 타 히어로 `ParticleUniverse/Scene.tsx(148,23)` 오류 1건(범위 밖).
- `npx eslint components/heroes/LiquidMorphing app/heroes/liquid-morphing`: 통과.

## 반응형·상태
- 모바일 <768: 텍스트 → 스테이지(52svh) 단일 컬럼. 768~1023: 상단 스테이지. ≥1024: 좌 텍스트 / 우 스테이지(left 38%).
- 상태 머신 loading → intro → idle ⇄ interacting → transitioning, fallback. intro/transitioning 중 포인터는 값만 갱신하고 상태 전환 안 함. 새 GSAP 타임라인 시작 시 이전 것 kill.

## 알려진 제약 / 남은 일
- 성능 측정값(장비·fps)은 측정 전이라 기록 없음. 패널 상단에 실시간 fps 표시.
- CTA는 `#lm-controls`(조작 패널) 앵커. HeroSlot에 CTA 슬롯이 없어 히어로 아래에 음수 마진으로 겹쳐 배치.
- 1440×900 / 1024×768 / 390×844 겹침·잘림 눈 확인 필요.
