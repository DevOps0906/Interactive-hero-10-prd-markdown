import type { QualityTier } from "@/lib/hero/performance";

// ───────── 식별자·타입 ─────────
export const MODULE_IDS = ["base", "shoulder", "elbow", "wrist", "gripper"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];
export type Pose = Record<ModuleId, number>;

export const LEVEL_ORDER = ["beginner", "intermediate", "advanced"] as const;
export type LevelId = (typeof LEVEL_ORDER)[number];
export const levelIndex = (l: LevelId) => LEVEL_ORDER.indexOf(l);
export const isUnlocked = (min: LevelId, current: LevelId) => levelIndex(current) >= levelIndex(min);

export type ViewMode = "free" | "home" | "front" | "side" | "top";
export type PartId =
  | "base-plate" | "base-motor" | "shoulder-motor" | "shoulder-link" | "elbow-motor"
  | "elbow-link" | "wrist-motor" | "wrist-imu" | "grip-hand" | "grip-cam";
export type Vec3 = [number, number, number];

// ───────── 모델 자산 (교체 지점) ─────────
/** GLB 교체 지점. null 이면 절차적 모델. 값을 넣으면 ASSET_CONTRACT 의 노드 이름으로 관절·부품을 찾는다. */
export const MODEL_ASSET: { url: string | null } = { url: null };

/** 로봇 치수(장면 단위, Y-up, 오른손 좌표). */
export const ARM = { baseHeight: 0.6, l1: 1.3, l2: 1.1, l3: 0.55, floorY: 0.06 } as const;
export const IK_PITCH_DEG = 140; // 엔드이펙터 목표 피치(수직 위가 0°)

// ───────── 관절 ─────────
export interface JointSpec {
  id: ModuleId;
  label: string;
  /** 모델 내 관절 노드 이름(자산 계약) */
  node: string;
  min: number;
  max: number;
  home: number;
  unit: "°" | "%";
  minLevel: LevelId;
  /** y: 수직축 회전, z: 로컬 Z 회전(부호 sign), open: 그리퍼 개폐 */
  axis: "y" | "z" | "open";
  sign: 1 | -1;
  desc: Record<LevelId, string>;
}

export const JOINTS: JointSpec[] = [
  { id: "base", label: "베이스 회전 (J1)", node: "joint_base", min: -170, max: 170, home: 0, unit: "°", minLevel: "beginner", axis: "y", sign: 1,
    desc: { beginner: "로봇 몸통을 좌우로 돌려요.", intermediate: "수직축(Y) 회전 관절. 범위 -170°~170°.", advanced: "J1: 수직축 회전. 목표 방위각 θ=atan2(-z, x)로 역기구학의 첫 단계를 결정." } },
  { id: "shoulder", label: "어깨 (J2)", node: "joint_shoulder", min: -75, max: 90, home: 15, unit: "°", minLevel: "beginner", axis: "z", sign: -1,
    desc: { beginner: "팔 전체를 앞뒤로 기울여요.", intermediate: "수평축 피치 관절. 0°는 수직 위, 양수는 앞쪽으로 기울어짐.", advanced: "J2: 링크1(1.3)을 구동. 어깨·팔꿈치가 2링크 평면 문제를 이룬다." } },
  { id: "elbow", label: "팔꿈치 (J3)", node: "joint_elbow", min: -10, max: 140, home: 60, unit: "°", minLevel: "intermediate", axis: "z", sign: -1,
    desc: { beginner: "팔꿈치를 굽혀요.", intermediate: "링크 사이 상대각. 범위 -10°~140°.", advanced: "J3: 코사인 법칙 cos(q3)=(d²-L1²-L2²)/(2·L1·L2)로 구한다(팔꿈치 위쪽 해만 사용)." } },
  { id: "wrist", label: "손목 (J4)", node: "joint_wrist", min: -90, max: 110, home: 60, unit: "°", minLevel: "intermediate", axis: "z", sign: -1,
    desc: { beginner: "손 방향을 바꿔요.", intermediate: "그리퍼 피치를 조절. 범위 -90°~110°.", advanced: "J4: 엔드이펙터 피치를 고정값(140°)으로 맞추는 잉여 자유도." } },
  { id: "gripper", label: "그리퍼 (J5)", node: "joint_gripper", min: 0, max: 100, home: 50, unit: "%", minLevel: "intermediate", axis: "open", sign: 1,
    desc: { beginner: "물건을 잡거나 놓아요.", intermediate: "손가락 개폐량 0~100%.", advanced: "J5: 직동(prismatic) 두 손가락. 개폐량은 위치 제어이며 힘 제어는 없음." } },
];
export const JOINT_BY_ID = Object.fromEntries(JOINTS.map((j) => [j.id, j])) as Record<ModuleId, JointSpec>;
export const HOME_POSE: Pose = { base: 0, shoulder: 15, elbow: 60, wrist: 60, gripper: 50 };

// ───────── 부품(해부) ─────────
export interface PartSpec {
  id: PartId;
  module: ModuleId;
  kind: "motor" | "link" | "sensor" | "base";
  name: string;
  /** 모델 내 부품 노드 이름(자산 계약) */
  node: string;
  explode: Vec3;
  desc: Record<LevelId, string>;
}

export const PARTS: PartSpec[] = [
  { id: "base-plate", module: "base", kind: "base", name: "고정 베이스", node: "part_base_plate", explode: [0, -0.35, 0],
    desc: { beginner: "로봇을 책상에 단단히 붙이는 받침이에요.", intermediate: "고정 베이스. 무게중심을 낮춰 흔들림을 줄인다.", advanced: "고정 프레임(0 DOF). 기준 좌표계 원점이 여기에 있다." } },
  { id: "base-motor", module: "base", kind: "motor", name: "회전 모터 (J1)", node: "part_base_motor", explode: [0, 0.35, 0],
    desc: { beginner: "몸통을 빙글 돌리는 모터예요.", intermediate: "수직축 서보 모터. 각도를 입력하면 그 위치로 이동한다.", advanced: "서보 + 감속기. 위치 피드백(엔코더)으로 목표각을 추종한다." } },
  { id: "shoulder-motor", module: "shoulder", kind: "motor", name: "어깨 모터 (J2)", node: "part_shoulder_motor", explode: [0, 0, 0.8],
    desc: { beginner: "팔을 들어 올리는 힘을 내요.", intermediate: "어깨 피치 모터. 링크1과 위쪽 부품의 무게를 지탱한다.", advanced: "가장 큰 토크가 필요한 관절. 베이스에 가까울수록 부하가 커진다." } },
  { id: "shoulder-link", module: "shoulder", kind: "link", name: "윗팔 링크", node: "part_shoulder_link", explode: [-0.9, 0.3, 0],
    desc: { beginner: "어깨와 팔꿈치를 잇는 막대예요.", intermediate: "링크1(길이 1.3). 길이가 도달 범위를 결정한다.", advanced: "강체 링크. 길이 L1 은 순기구학 식의 상수로 들어간다." } },
  { id: "elbow-motor", module: "elbow", kind: "motor", name: "팔꿈치 모터 (J3)", node: "part_elbow_motor", explode: [0, 0, -0.8],
    desc: { beginner: "팔꿈치를 접고 펴요.", intermediate: "링크 사이 각도를 만드는 서보 모터.", advanced: "상대각 q3. 두 링크 길이가 다르면 도달 영역의 안쪽 구멍이 생긴다." } },
  { id: "elbow-link", module: "elbow", kind: "link", name: "아랫팔 링크", node: "part_elbow_link", explode: [0.9, 0.3, 0],
    desc: { beginner: "팔꿈치와 손목을 잇는 막대예요.", intermediate: "링크2(길이 1.1).", advanced: "링크2. 손목 도달 범위는 |L1-L2| ~ L1+L2 의 환형 영역." } },
  { id: "wrist-motor", module: "wrist", kind: "motor", name: "손목 모터 (J4)", node: "part_wrist_motor", explode: [0, 0, 0.7],
    desc: { beginner: "손의 방향을 돌려요.", intermediate: "그리퍼 피치 모터.", advanced: "엔드이펙터 자세를 담당. 위치와 자세를 분리해 풀 수 있다." } },
  { id: "wrist-imu", module: "wrist", kind: "sensor", name: "기울기 센서 (IMU)", node: "part_wrist_imu", explode: [0.6, 0.5, -0.5],
    desc: { beginner: "손이 얼마나 기울었는지 느껴요.", intermediate: "가속도·자이로 센서. 자세 값을 읽는다.", advanced: "IMU 는 상대 자세 추정에 쓰이며 드리프트 보정이 필요하다." } },
  { id: "grip-hand", module: "gripper", kind: "link", name: "그리퍼 손가락", node: "part_grip_hand", explode: [0, 0.7, 0],
    desc: { beginner: "물건을 집는 두 손가락이에요.", intermediate: "평행 그리퍼. 두 손가락이 같은 거리만큼 움직인다.", advanced: "직동 관절 2개를 하나의 개폐량으로 묶은 구조(미러 구속)." } },
  { id: "grip-cam", module: "gripper", kind: "sensor", name: "손 카메라", node: "part_grip_cam", explode: [0, 0.4, 0.8],
    desc: { beginner: "물건을 눈으로 확인해요.", intermediate: "손바닥 카메라. 물체 위치를 찾는 데 쓴다.", advanced: "카메라 좌표→로봇 좌표 변환(핸드-아이 보정)이 정확해야 집기가 된다." } },
];
export const PART_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, PartSpec>;

/** 모델 교체 시 검증할 노드 이름 목록. 하나라도 없으면 절차적 모델로 폴백한다. */
export const ASSET_CONTRACT = {
  units: "scene unit, Y-up, 오른손",
  joints: JOINTS.map((j) => j.node),
  parts: PARTS.map((p) => p.node),
  fingers: ["finger_l", "finger_r"],
  materialSlots: ["mat_base", "mat_motor", "mat_link", "mat_sensor"],
  animationClips: "없음(관절 회전은 코드가 구동)",
} as const;

// ───────── 레벨 ─────────
export interface LevelSpec { id: LevelId; label: string; summary: string; unlocks: string }
export const LEVELS: LevelSpec[] = [
  { id: "beginner", label: "초급", summary: "몸통·어깨를 움직이고 프리셋 동작을 따라 봐요.", unlocks: "J1~J2 조작, 프리셋 재생" },
  { id: "intermediate", label: "중급", summary: "모든 관절을 조절하고 명령 큐를 직접 만들어요.", unlocks: "J1~J5 조작, 명령 큐 편집" },
  { id: "advanced", label: "고급", summary: "목표 좌표를 주면 관절 각도를 계산하는 IK 를 체험해요.", unlocks: "IK 목표점, 수식 설명" },
];

// ───────── 프리셋(명령 큐) ─────────
export interface Command { id: string; label: string; pose: Pose; ms: number }
const P = (base: number, shoulder: number, elbow: number, wrist: number, gripper: number): Pose => ({ base, shoulder, elbow, wrist, gripper });
const C = (pre: string, i: number, label: string, pose: Pose, ms = 800): Command => ({ id: `${pre}-${i}`, label, pose, ms });

export interface PresetSpec { id: string; label: string; description: string; commands: Command[] }
export const PRESETS: PresetSpec[] = [
  { id: "greet", label: "인사", description: "팔을 들고 좌우로 흔들어요.",
    commands: [C("greet", 0, "준비", P(0, 15, 60, 60, 50)), C("greet", 1, "팔 들기", P(0, -20, 20, -30, 100), 900), C("greet", 2, "왼쪽", P(-25, -20, 20, -30, 100), 500),
      C("greet", 3, "오른쪽", P(25, -20, 20, -30, 100), 500), C("greet", 4, "왼쪽", P(-25, -20, 20, -30, 100), 500), C("greet", 5, "복귀", HOME_POSE, 900)] },
  { id: "pick", label: "집기", description: "물건을 집어 옆으로 옮겨 놓아요.",
    commands: [C("pick", 0, "준비", P(0, 15, 60, 60, 100)), C("pick", 1, "접근", P(60, 50, 90, 60, 100), 900), C("pick", 2, "내리기", P(60, 70, 100, 70, 100), 800),
      C("pick", 3, "잡기", P(60, 70, 100, 70, 10), 600), C("pick", 4, "들기", P(60, 20, 60, 40, 10), 800), C("pick", 5, "이동", P(-50, 20, 60, 40, 10), 1000),
      C("pick", 6, "놓기", P(-50, 65, 100, 70, 100), 800), C("pick", 7, "복귀", HOME_POSE, 900)] },
  { id: "spin", label: "회전", description: "몸통을 크게 돌려 봐요.",
    commands: [C("spin", 0, "준비", P(0, 15, 60, 60, 50)), C("spin", 1, "오른쪽 120°", P(120, 15, 60, 60, 50), 1000), C("spin", 2, "왼쪽 120°", P(-120, 15, 60, 60, 50), 1600), C("spin", 3, "복귀", HOME_POSE, 1000)] },
];

// ───────── 카메라·품질 ─────────
export const CAMERA = { fov: 42, target: [0, 1.4, 0] as Vec3, minDistance: 4, maxDistance: 11 };
export const VIEWS: Record<Exclude<ViewMode, "free">, Vec3> = {
  home: [4.6, 3.4, 5.4], front: [0.001, 2.2, 7.2], side: [7.2, 2.2, 0.001], top: [0.001, 8.5, 0.001],
};
export const VIEW_LABEL: Record<ViewMode, string> = { free: "자유", home: "기본", front: "정면", side: "측면", top: "위" };

export interface QualityPreset { segments: number; dpr: number; environment: boolean; shadows: boolean }
export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: { segments: 12, dpr: 1, environment: false, shadows: false },
  medium: { segments: 20, dpr: 1.5, environment: true, shadows: false },
  high: { segments: 32, dpr: 2, environment: true, shadows: true },
};

// ───────── 데모 데이터 어댑터(외부 시간표·가격 주입 지점) ─────────
export interface LessonInfo { level: LevelId; title: string; weeks: number; minutes: number; priceLabel: string }
/** DEMO: 실제 커리큘럼·수강료가 아니다. 실서비스에서는 이 어댑터를 API 호출로 교체한다. */
export const mockData = {
  label: "DEMO",
  lessons: [
    { level: "beginner", title: "움직이는 로봇 첫걸음", weeks: 8, minutes: 60, priceLabel: "월 000,000원 (데모 예시)" },
    { level: "intermediate", title: "명령 순서로 동작 만들기", weeks: 12, minutes: 80, priceLabel: "월 000,000원 (데모 예시)" },
    { level: "advanced", title: "좌표로 제어하는 역기구학", weeks: 16, minutes: 90, priceLabel: "월 000,000원 (데모 예시)" },
  ] as LessonInfo[],
};
export const getLesson = (level: LevelId): LessonInfo => mockData.lessons.find((l) => l.level === level) ?? mockData.lessons[0];
