# Industry Interactive Hero PRD Pack

2026-11-03 / 10개 독립 프로젝트 + 통합 가이드

## 사용법
1. 원하는 업종의 `_PRD.md`를 개발 프로젝트 루트에 복사한다.
2. Claude Code 또는 Codex에 `이 PRD를 읽고 P0~P6 순서대로 구현하라. 코드를 실행·검증하고 미검증 사항을 기록하라.`라고 지시한다.
3. **가장 먼저** 실제 GLB 자산과 사용 권한, CTA 연결 대상을 준비한다. 모델이 없으면 임시 절차형 3D 메쉬로 기능 검증을 진행한다.
4. 업종별 실제 데이터/의료·법률 문구는 검수 후 교체한다.

## 10종 목록
| No | 히어로 | 업종 |
|---|---|---|
| 01 | [Architecture Blueprint Reveal](./01_architecture_building_reveal_PRD.md) | 건축사·설계사무소 |
| 02 | [Real Estate Unit Explorer](./02_realestate_unit_explorer_PRD.md) | 분양·부동산 중개 |
| 03 | [Legal Case Journey](./03_legal_case_journey_PRD.md) | 법무사·법률 사무소 |
| 04 | [Sneaker Configurator Hero](./04_sneaker_customizer_PRD.md) | 운동화 쇼핑몰·D2C 브랜드 |
| 05 | [Fashion Avatar Lookbook](./05_fashion_avatar_tryon_PRD.md) | 의류 쇼핑몰·패션 브랜드 |
| 06 | [Anatomy Care Explorer](./06_hospital_anatomy_explorer_PRD.md) | 병원·클리닉 |
| 07 | [Robot Learning Lab](./07_academy_robot_lab_PRD.md) | 코딩학원·로봇교육·AI 교육 |
| 08 | [Virtual Campus Tour](./08_academy_virtual_campus_PRD.md) | 입시학원·직업학교·교육기관 |
| 09 | [Dental Procedure Explorer](./09_clinic_dental_3d_PRD.md) | 치과·의료기관 |
| 10 | [Interior Space Configurator](./10_property_interior_configurator_PRD.md) | 인테리어·건축·부동산·가구 쇼핑몰 |

## 주요 레퍼런스
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader
- Three.js OrbitControls: https://threejs.org/docs/pages/OrbitControls
- React Three Fiber docs: https://r3f.docs.pmnd.rs/
- Google model-viewer & AR: https://developers.google.com/ar/develop/webxr/model-viewer
- Nike By You: https://www.nike.com/w/nike-by-you-3abn9z6ealhz90poy

이 주소들은 기술 및 UX 참조이며 사용자가 보유하지 않은 제3자 디자인/모델 자산을 복제할 권리를 부여하지 않습니다.

## 추천 개발 순서
04 운동화 → 01 건축 → 10 인테리어 → 02 부동산 → 07 로봇 → 08 캠퍼스 → 05 의류 → 03 법무사 → 06 병원 → 09 치과.

## 주의
문서는 구현을 지시하는 PRD이며 동작하는 애니메이션 소스 자체는 아닙니다. 최종 모델 품질·실제 데이터 연동·의료/법률 표현은 별도 QA가 필요합니다.
