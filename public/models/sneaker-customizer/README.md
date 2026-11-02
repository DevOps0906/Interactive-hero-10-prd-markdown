# sneaker-customizer 모델 자산 (교체 지점)

현재는 GLB 없이 `components/industry/SneakerConfigurator/geometry.ts` 의 절차적 모델을 쓴다.
GLB 로 바꾸려면 이 폴더에 `sneaker.glb` 를 두고 `config.ts` 의 `MODEL_ASSET.url` 을 `"/models/sneaker-customizer/sneaker.glb"` 로 바꾼다.

## 자산 체크리스트 (GLB 교체 시 모두 확인)
| 항목 | 요구 |
|---|---|
| 노드 이름 | `upper`, `sole`, `laces`, `heel` (대소문자 일치, 누락 시 절차적 모델로 자동 대체 + 콘솔 경고) |
| 재질 슬롯 | 부위당 1개(코드가 `MeshStandardMaterial` 로 덮어써 색·소재를 적용). `upper` 는 UV 필요(텍스처 반복) |
| 단위·축 | 미터, Y-up, +X = 앞코, 길이 약 3.05 단위(씬 스케일에 맞출 것), 원점 = 발바닥 중앙 |
| 피벗 | 분해 뷰가 각 노드를 상대 이동하므로 노드 원점은 모델 원점과 같게(변환 베이크) |
| 폴리곤 | 권장 80k 삼각형 이하(모바일 40k), 텍스처는 코드가 생성하므로 불필요 |
| 애니메이션 | 없음(분해·회전은 코드로 구동) |
| 라이선스 | 직접 제작 또는 상업 이용 가능 확인. 타사 상표·형상·텍스처 금지 |
