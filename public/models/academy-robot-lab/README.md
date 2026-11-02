# academy-robot-lab 모델 자산 체크리스트

현재 GLB 없음(절차적 모델 사용). 교체 방법: `components/industry/RobotLearningLab/README.md` 의 "모델 교체 가이드".

- 파일명: `robot.glb` (glTF 2.0), 라이선스·소유권 확인 후 이 폴더에 둔다.
- 단위/축: scene unit, Y-up, 오른손. 원점 = 베이스 바닥 중심.
- 관절 노드(계층 중첩): `joint_base` > `joint_shoulder`(y=0.6) > `joint_elbow`(+1.3) > `joint_wrist`(+1.1) > `joint_gripper`(+0.1).
- 부품 노드 10개: `part_base_plate`, `part_base_motor`, `part_shoulder_motor`, `part_shoulder_link`, `part_elbow_motor`, `part_elbow_link`, `part_wrist_motor`, `part_wrist_imu`, `part_grip_hand`, `part_grip_cam`.
- 손가락 노드: `finger_l`(+Z), `finger_r`(-Z), 기준 |z|=0.05.
- 재질 슬롯: `mat_base`, `mat_motor`, `mat_link`, `mat_sensor`. 애니메이션 클립: 없음.
- 권장 폴리곤 수: 전체 20k 삼각형 이하.
