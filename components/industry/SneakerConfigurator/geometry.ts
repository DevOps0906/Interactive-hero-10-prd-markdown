import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// 오리지널 절차적 스니커즈. 좌표: +X = 앞코, Y = 위, Z = 폭. 길이 X_MIN..X_MAX.
export const X_MIN = -1.55;
export const X_MAX = 1.5;
const LEN = X_MAX - X_MIN;
const HALF_W = 0.5;

/** 평면 윤곽 포락선(0..1). 둥근 사각형(superellipse) — 볼 부분이 가장 넓다 */
function env(t: number, p = 2.4) {
  const tp = Math.pow(THREE.MathUtils.clamp(t, 0, 1), 1.2);
  return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * tp - 1), p)), 1 / p);
}

const H_KEYS: [number, number][] = [
  [0, 0.95],
  [0.15, 1.0],
  [0.35, 0.8],
  [0.55, 0.72],
  [0.8, 0.48],
  [1, 0.32],
];
function heightAt(t: number) {
  for (let i = 1; i < H_KEYS.length; i++) {
    if (t <= H_KEYS[i][0]) {
      const [t0, h0] = H_KEYS[i - 1];
      const [t1, h1] = H_KEYS[i];
      return THREE.MathUtils.lerp(h0, h1, THREE.MathUtils.smoothstep(t, t0, t1));
    }
  }
  return H_KEYS[H_KEYS.length - 1][1];
}

/** 갑피 표면 위의 점. theta 0..PI 는 오른쪽 바닥 → 능선 → 왼쪽 바닥. */
export function surface(t: number, theta: number, grow = 1, out = new THREE.Vector3()) {
  const e = env(t);
  const w = HALF_W * e * (0.82 + 0.18 * t);
  const dip = 0.3 * Math.exp(-(((t - 0.26) / 0.09) ** 2)) * Math.exp(-(((theta - Math.PI / 2) / 0.6) ** 2));
  const h = Math.max(0.05, heightAt(t) * Math.sqrt(e) - dip);
  return out.set(X_MIN + t * LEN, Math.sin(theta) * h * grow, Math.cos(theta) * w * grow);
}

/** t0..t1 구간 표면 메시(갑피 전체 또는 뒤꿈치 패치). 닫힌 윗면, uv 포함. */
export function buildShell(t0 = 0, t1 = 1, grow = 1, nx = 56, na = 28) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i <= nx; i++) {
    const t = t0 + ((t1 - t0) * i) / nx;
    for (let j = 0; j <= na; j++) {
      surface(t, (Math.PI * j) / na, grow, v);
      pos.push(v.x, v.y, v.z);
      uv.push(t, j / na);
    }
  }
  const row = na + 1;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < na; j++) {
      const a = i * row + j;
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** 밑창: 평면 윤곽을 아래로 압출(위 y=0 → 아래 y=-depth). */
export function buildSole(depth = 0.2) {
  const shape = new THREE.Shape();
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const z = HALF_W * env(t, 2.1) * (0.82 + 0.18 * t) * 1.07 + 0.02;
    if (i === 0) shape.moveTo(X_MIN + t * LEN, z);
    else shape.lineTo(X_MIN + t * LEN, z);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    shape.lineTo(X_MIN + t * LEN, -(HALF_W * env(t, 2.1) * (0.82 + 0.18 * t) * 1.07 + 0.02));
  }
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.035, bevelSegments: 3, curveSegments: 6 });
  g.rotateX(Math.PI / 2); // (x,y,z) → (x,-z,y): 형상 y → 월드 z, 압출 z → 아래쪽
  g.translate(0, 0, 0);
  g.computeVertexNormals();
  return g;
}

/** 끈: 발등을 가로지르는 튜브 여러 줄 + 매듭 */
export function buildLaces() {
  const parts: THREE.BufferGeometry[] = [];
  const rungs = 6;
  for (let i = 0; i < rungs; i++) {
    const t = 0.46 + (0.3 * i) / (rungs - 1);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) {
      const theta = 0.45 + ((Math.PI - 0.9) * k) / 8;
      pts.push(surface(t + 0.012 * Math.sin(k), theta, 1.025));
    }
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.024, 6, false));
  }
  // 매듭 + 늘어진 끝
  const top = surface(0.4, Math.PI / 2, 1.02);
  const knot = new THREE.TorusKnotGeometry(0.05, 0.02, 24, 6);
  knot.translate(top.x, top.y + 0.04, top.z);
  parts.push(knot);
  for (const s of [-1, 1]) {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(top.x, top.y + 0.05, top.z),
      new THREE.Vector3(top.x - 0.12, top.y + 0.1, top.z + s * 0.1),
      new THREE.Vector3(top.x - 0.22, top.y + 0.02, top.z + s * 0.2),
    ]);
    parts.push(new THREE.TubeGeometry(c, 12, 0.018, 6, false));
  }
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
  parts.forEach((p) => p.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** 뒤꿈치 패치(표면보다 4% 크게) + 풀탭 */
export function buildHeel() {
  const patch = buildShell(0, 0.24, 1.04, 14, 28).toNonIndexed();
  const tab = new THREE.BoxGeometry(0.07, 0.24, 0.16, 1, 1, 1);
  const base = surface(0.01, Math.PI / 2, 1);
  tab.translate(base.x - 0.01, base.y + 0.08, 0);
  const merged = mergeGeometries([patch, tab.toNonIndexed()], false);
  patch.dispose();
  tab.dispose();
  return merged ?? new THREE.BufferGeometry();
}
