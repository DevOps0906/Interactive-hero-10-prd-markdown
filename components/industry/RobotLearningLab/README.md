# Robot Learning Lab (07, `/industry/academy-robot-lab`)

코딩학원·로봇교육 히어로. 5축 교육용 로봇 팔(절차적 지오메트리)을 슬라이더·프리셋·IK 로 조작하고 체험 수업 신청(데모 폼)으로 연결한다. **물리 로봇을 제어하지 않는다.**

## 구조
| 파일 | 역할 |
|---|---|
| `RobotLearningLabHero.tsx` | HeroSlot 조립, 전체화면, 폴백 |
| `useLab.ts` | 단일 reducer(`selectedId`·`viewMode`·`angles`·`ik`·`queue`·`running`), 환경 감지, 이벤트 `track` |
| `Scene.tsx` | R3F 장면(동적 로딩), 절차적/GLB 로봇, 관절 보간, 분해, IK 마커 |
| `config.ts` | 관절·부품·레벨·프리셋·품질·`mockData` 어댑터·`MODEL_ASSET` |
| `kinematics.ts` | 순/역기구학, 안전 표시 |
| `Controls.tsx` `TrialForm.tsx` `Summary.tsx` | 조작 패널 / 신청 폼 / 요약·바텀시트 |

## 제어 옵션
| 옵션 | 초급 | 중급 | 고급 |
|---|---|---|---|
| J1 베이스, J2 어깨 | O | O | O |
| J3 팔꿈치, J4 손목, J5 그리퍼 | 잠금 | O | O |
| 프리셋 실행 | O | O | O |
| 명령 큐 편집(포즈 추가/삭제/비우기) | 잠금 | O | O |
| IK 목표점 X/Y/Z | 잠금 | 잠금 | O |
| 부품 분해·시점·되돌리기·초기화·전체화면 | O | O | O |

## 모델 교체 가이드
1. `config.ts` 의 `MODEL_ASSET.url` 에 `/models/academy-robot-lab/robot.glb` 를 넣는다(외부 URL 금지).
2. GLB 는 `ASSET_CONTRACT` 의 노드 이름을 모두 가져야 한다: 관절 `joint_base/shoulder/elbow/wrist/gripper`(계층 중첩, 피벗 = 관절 위치), 부품 `part_*` 10개, 손가락 `finger_l/finger_r`. 하나라도 없으면 정지 이미지로 폴백한다.
3. 축·단위: Y-up, 오른손. 베이스는 Y축, 어깨·팔꿈치·손목은 로컬 Z축 회전(양수 = 앞으로 기울임), 링크 길이는 `config.ARM`(1.3 / 1.1 / 0.55)과 맞춘다.
4. 알려진 제한: GLB 모드에서는 선택 하이라이트(재질 발광)가 적용되지 않는다. 자산 체크리스트는 `public/models/academy-robot-lab/README.md`.

## 완료 / 미완료
- 완료: P1~P5 코드(정적 HTML·포스터 폴백, 3D 기초, 인터랙션 7종, CTA·폼 데모, 언마운트 정리).
- 미완료·미검증: 브라우저 실행·터치·스크린리더 확인, 성능 측정(fps/LCP/CLS)과 캡처, 실제 GLB 자산(현재 절차적 모델), GLB 선택 하이라이트, 분석 도구 연동(`hero:event` 구독자).
- `isAnimating` 은 명령 실행·인트로 중으로 정의했다(관절 보간 잔여는 포함하지 않음).

## 성능 측정 결과
미측정(next dev/build 금지 조건). 구현된 장치: DPR 상한(`QUALITY_PRESETS`), 프레임 평균 22ms 초과 시 품질 하향, 화면 밖·탭 숨김 시 `frameloop="never"`, 모바일 low 등급 고정.
