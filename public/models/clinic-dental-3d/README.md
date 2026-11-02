# 치아·턱 GLB 자산 체크리스트 (clinic-dental-3d)

현재는 GLB가 없어 three 기본 지오메트리로 만든 절차적 치열을 쓴다. 실제 모델로 교체할 때:

1. 파일을 이 폴더에 넣고 `components/industry/DentalProcedureExplorer/config.ts`의 `MODEL_ASSET.url`에 `/models/clinic-dental-3d/<file>.glb` 지정.
2. 검수 항목

| 항목 | 기준 |
|---|---|
| 노드 이름 | 치아마다 `tooth-<FDI>` (예: `tooth-11` … `tooth-48`, 28~32개). 하위 메시는 부모가 이 이름이면 선택 대상 |
| 단위·축 | 1 unit = 약 1cm 환산 장면 스케일(치열 폭 약 4.5 unit), Y up, +Z가 정면(앞니 쪽) |
| 원점 | 치열 중심 (0, 0, 0 근처). 카메라 기본값은 `CAMERA` 상수 |
| 재질 슬롯 | 치아 `enamel`, 잇몸 `gum`. 선택 강조는 코드가 재질을 교체 |
| 폴리곤 | 전체 100k tris 이하 권장(모바일 low 등급 고려), 압축 Draco/meshopt 시 로더 설정 필요 |
| 애니메이션 | 필수 아님. 절차 단계는 코드 상태(축소·보철 캡·브라켓·와이어)로 표현 |
| 라이선스 | 소유권·재배포 가능 여부 확인(출처를 README에 기록) |

주의: 단계 오버레이(스캔 링·보철 캡·브라켓·와이어)와 카메라 포커스는 `config.ts`의 `TEETH` 좌표를 쓴다. 모델 좌표가 다르면 `TEETH`를 모델에 맞게 갱신해야 한다.
