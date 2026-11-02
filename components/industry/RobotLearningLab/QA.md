# Robot Learning Lab — QA (PRD 공통 검수 체크리스트)

검증 범위: `npx tsc --noEmit`, `npx eslint`(이 폴더 + 라우트)와 코드 검토, IK 수식의 순·역기구학 왕복 계산(Node 스크립트)만 수행. 브라우저 실행(next dev/build 금지)과 실기기는 **미검증**.

| 항목 | 구현 근거 | 결과 |
|---|---|---|
| 첫 로드에서 CTA 즉시 노출, 3D 실패 시 포스터/폼 유지 | `HeroSlot` cta(SSR HTML), `useLab` WebGL 사전 검사·로딩 9초 데드라인·컨텍스트 손실 → `fail` → poster.svg + 패널·폼 유지 | 코드 구현 / 브라우저 미검증 |
| 선택 컨트롤의 텍스트 상태 | 슬라이더 `output`·`aria-valuetext`, `aria-pressed`, `aria-current="step"`, `role=status` 안내 | 코드 구현 / 스크린리더 미검증 |
| 터치 드래그·스크롤 충돌 | 스테이지·canvas `touch-action: pan-y`, 줌·팬 끔 | 코드 구현 / 실기기 미검증 |
| 포커스 복귀·ESC·키보드 | 슬라이더·버튼 모두 네이티브, 바텀시트 ESC 닫기 후 토글로 포커스 복귀, CTA 클릭 시 폼 첫 입력 포커스 | 코드 구현 / 미검증 |
| 반복 열고 닫기 시 누수 | 타이머 전부 effect cleanup, 재질 dispose, R3F 자동 geometry dispose, IntersectionObserver·리스너 해제 | 코드 구현 / 누수 측정 미검증 |
| 불확실 수치·가격 표시 | `mockData` DEMO 라벨, 가격 "데모 예시", 물리 로봇 미제어 문구 | 충족 |
| CTA→폼 제출→확인 흐름 | `TrialForm` 검증(이름·연락처·동의)·확인 상태, 저장/전송 없음, 레벨 자동 반영 | 코드 구현 / E2E 미검증 |
| 인터랙션 1 Joint Control | `Controls` 슬라이더 → `useLab.angles` → `Scene` 관절 회전 | 코드 구현 |
| 인터랙션 2 Preset Actions | `config.PRESETS`, `play/advance` 타이머, 3D 감쇠 보간 | 코드 구현 |
| 인터랙션 3 IK-lite | `kinematics.solveIk`(한계 클램프·도달 여부), 순기구학 왕복 오차 0 확인 | 계산 검증 / 화면 미검증 |
| 인터랙션 4 Command Queue | `Controls` 노드 목록, 실행 단계 강조 | 코드 구현 |
| 인터랙션 5 Exploded Anatomy | `PARTS.explode`, 분해 보간, 3D 라벨, 패널 설명 | 코드 구현 |
| 인터랙션 6 Lesson Level | 관절 잠금·큐 편집·IK·설명 깊이 레벨 연동 | 코드 구현 |
| 인터랙션 7 Trial CTA | 폼 `level` ↔ `state.level` 양방향 | 코드 구현 |
| E2E-02 빠른 변경 | reducer가 단계·실행 중 편집 거부, 되돌리기 기록(30개) | 코드 구현 / 미검증 |
| E2E-03 WebGL/모션 감소 | reduced면 보간·인트로 즉시, 폴백 포스터 | 코드 구현 / 환경 미검증 |
| 측정 이벤트 | `track()` → `window` `hero:event`(개인정보 없음) | 코드 구현 |
| 성능·캡처(1440/1024/768/390) | — | **미검증** |
| `npx tsc --noEmit` | 전체 오류 0 | 통과 |
| eslint (폴더 + 라우트) | 오류 0 | 통과 |
