# academy-virtual-campus 모델 자산 계약

현재 GLB 없음 — 절차적 모델(`components/industry/VirtualCampusTour/Scene.tsx`)이 대체한다.
교체 방법은 `components/industry/VirtualCampusTour/README.md` 참고.

| 항목 | 값 |
|---|---|
| 형식 | glTF 2.0 GLB, 파일명 `campus.glb`, Draco/Meshopt 압축 권장 |
| 단위·축 | 미터(m), Y-up, 전경 기준 +Z 가 정면 |
| 필수 노드 | `room-lobby` `room-classroom-a` `room-classroom-b` `room-lab` `room-studio` (각 공간 루트 Group, 원점이 바닥 중심) |
| 좌표 | `config.ts` DEMO_DATA.spaces[].position 과 일치 (예: classroom-a = -2.5, 0, 0) |
| 크기 | 공간당 약 3.6 x 3.2 m(로비 5.4 x 3.2), 벽 높이 약 1.1 m(지붕 없음) |
| 재질 | PBR, 금속성 낮게, 기본 색 밝기 #3a4252 이상 |
| 폴리곤 | 합계 6만 삼각형 이하 |
| 애니메이션 | 없음(카메라는 코드로 이동) |
| 라이선스 | 제작자·출처·라이선스를 이 폴더에 기록, 실제 시설 사진과 다르면 화면에 고지 |
