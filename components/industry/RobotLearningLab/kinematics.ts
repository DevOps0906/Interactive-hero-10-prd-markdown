import { ARM, IK_PITCH_DEG, JOINT_BY_ID, MODULE_IDS, type ModuleId, type Pose, type Vec3 } from "./config";

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const clampJoint = (id: ModuleId, v: number) => clamp(v, JOINT_BY_ID[id].min, JOINT_BY_ID[id].max);
export function clampPose(p: Pose): Pose {
  const out = { ...p };
  for (const id of MODULE_IDS) out[id] = clampJoint(id, p[id]);
  return out;
}

/** 순기구학. 평면(r,h)에서 계산 후 베이스 회전을 적용한다. 원점 = 베이스 바닥 중심. */
export function forward(p: Pose): { elbow: Vec3; wrist: Vec3; tip: Vec3 } {
  const a1 = rad(p.shoulder), a2 = a1 + rad(p.elbow), a3 = a2 + rad(p.wrist);
  const er = ARM.l1 * Math.sin(a1), eh = ARM.baseHeight + ARM.l1 * Math.cos(a1);
  const wr = er + ARM.l2 * Math.sin(a2), wh = eh + ARM.l2 * Math.cos(a2);
  const tr = wr + ARM.l3 * Math.sin(a3), th = wh + ARM.l3 * Math.cos(a3);
  const b = rad(p.base);
  const w = (r: number, h: number): Vec3 => [r * Math.cos(b), h, -r * Math.sin(b)];
  return { elbow: w(er, eh), wrist: w(wr, wh), tip: w(tr, th) };
}

export interface IkTarget { x: number; y: number; z: number }
export const IK_RANGE = { x: [-2.4, 2.4], y: [0.2, 2.6], z: [-2.4, 2.4] } as const;
export const clampIk = (t: IkTarget): IkTarget => ({
  x: clamp(t.x, IK_RANGE.x[0], IK_RANGE.x[1]), y: clamp(t.y, IK_RANGE.y[0], IK_RANGE.y[1]), z: clamp(t.z, IK_RANGE.z[0], IK_RANGE.z[1]),
});

/** IK-lite: 베이스 방위각 + 2링크 해(팔꿈치 위) + 고정 엔드이펙터 피치. 관절 한계로 클램프하고 도달 여부를 알려준다. */
export function solveIk(t: IkTarget, current: Pose): { pose: Pose; reached: boolean; error: number } {
  const r = Math.hypot(t.x, t.z);
  const base = r < 1e-3 ? rad(current.base) : Math.atan2(-t.z, t.x);
  const a3 = rad(IK_PITCH_DEG);
  const wx = r - ARM.l3 * Math.sin(a3);
  const wy = t.y - ARM.l3 * Math.cos(a3) - ARM.baseHeight;
  const d = clamp(Math.hypot(wx, wy), Math.abs(ARM.l1 - ARM.l2) + 0.01, ARM.l1 + ARM.l2 - 0.001);
  const phi = Math.atan2(wx, wy);
  const q3 = Math.acos(clamp((d * d - ARM.l1 ** 2 - ARM.l2 ** 2) / (2 * ARM.l1 * ARM.l2), -1, 1));
  const q2 = phi - Math.atan2(ARM.l2 * Math.sin(q3), ARM.l1 + ARM.l2 * Math.cos(q3));
  const pose = clampPose({ base: deg(base), shoulder: deg(q2), elbow: deg(q3), wrist: deg(a3 - (q2 + q3)), gripper: current.gripper });
  const tip = forward(pose).tip;
  const error = Math.hypot(tip[0] - t.x, tip[1] - t.y, tip[2] - t.z);
  return { pose, reached: error < 0.08, error };
}

export interface Safety { floor: boolean; atLimit: ModuleId[] }
/** 교육용 안전 표시(실제 충돌 계산 아님): 손끝·손목이 바닥 근처이거나 관절이 한계에 닿았는지. */
export function checkSafety(p: Pose): Safety {
  const f = forward(p);
  const atLimit = MODULE_IDS.filter((id) => id !== "gripper" && (p[id] - JOINT_BY_ID[id].min < 1 || JOINT_BY_ID[id].max - p[id] < 1));
  return { floor: f.tip[1] < ARM.floorY + 0.04 || f.wrist[1] < ARM.floorY + 0.1, atLimit };
}
