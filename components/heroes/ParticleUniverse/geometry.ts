import { Color } from "three";
import { SPHERE_RADIUS } from "./config";

export interface ParticleBuffers {
  /** Fibonacci sphere (three의 `position` attribute로 사용) */
  sphere: Float32Array;
  spiral: Float32Array;
  mark: Float32Array;
  /** 인트로 집결 전 흩어진 위치 */
  scatter: Float32Array;
  color: Float32Array;
  size: Float32Array;
  seed: Float32Array;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 동일한 입자 수로 세 형태·흩어진 위치·색·크기 typed buffer를 만든다 (결정적). */
export function buildParticles(count: number): ParticleBuffers {
  const rand = mulberry32(0x5eed1234);
  const sphere = new Float32Array(count * 3);
  const spiral = new Float32Array(count * 3);
  const mark = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);

  const golden = Math.PI * (3 - Math.sqrt(5));
  const tilt = 0.45;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const cool = new Color("#9fb4ff");
  const warm = new Color("#e8f4ff");
  const tmp = new Color();
  const markSplit = Math.floor(count * 0.62);

  for (let i = 0; i < count; i++) {
    const k = i * 3;

    // 1) Fibonacci sphere
    const y = 1 - ((i + 0.5) / count) * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden;
    sphere[k] = Math.cos(phi) * r * SPHERE_RADIUS;
    sphere[k + 1] = y * SPHERE_RADIUS;
    sphere[k + 2] = Math.sin(phi) * r * SPHERE_RADIUS;

    // 2) 3-arm spiral disc (XY 평면, X축 기울임)
    const t = (i + 0.5) / count;
    const sr = Math.sqrt(t) * SPHERE_RADIUS * 1.25;
    const theta = sr * 1.9 + (i % 3) * ((Math.PI * 2) / 3) + (rand() - 0.5) * 0.35;
    const sx = Math.cos(theta) * sr;
    const sy = Math.sin(theta) * sr;
    const sz = (rand() - 0.5) * 0.3 * (1 - t * 0.5);
    spiral[k] = sx;
    spiral[k + 1] = sy * cosT - sz * sinT;
    spiral[k + 2] = sy * sinT + sz * cosT;

    // 3) 브랜드 마크: 링(토러스) + 중심 마름모
    if (i < markSplit) {
      const u = rand() * Math.PI * 2;
      const v = rand() * Math.PI * 2;
      const major = SPHERE_RADIUS * 0.95;
      const minor = 0.2;
      mark[k] = (major + minor * Math.cos(v)) * Math.cos(u);
      mark[k + 1] = (major + minor * Math.cos(v)) * Math.sin(u);
      mark[k + 2] = minor * Math.sin(v);
    } else {
      let dx = rand() - 0.5;
      let dy = rand() - 0.5;
      let dz = rand() - 0.5;
      const l1 = Math.abs(dx) + Math.abs(dy) + Math.abs(dz) || 1;
      const s = (SPHERE_RADIUS * 0.7) / l1;
      dx *= s;
      dy *= s;
      dz *= s * 0.6;
      mark[k] = dx;
      mark[k + 1] = dy;
      mark[k + 2] = dz;
    }

    // 흩어진 시작 위치
    let ex = rand() * 2 - 1;
    let ey = rand() * 2 - 1;
    let ez = rand() * 2 - 1;
    const el = Math.hypot(ex, ey, ez) || 1;
    const er = 6 + rand() * 10;
    ex = (ex / el) * er;
    ey = (ey / el) * er;
    ez = (ez / el) * er;
    scatter[k] = ex;
    scatter[k + 1] = ey;
    scatter[k + 2] = ez;

    tmp.copy(cool).lerp(warm, rand());
    color[k] = tmp.r;
    color[k + 1] = tmp.g;
    color[k + 2] = tmp.b;
    size[i] = 0.6 + rand() * 1.0;
    seed[i] = rand();
  }

  return { sphere, spiral, mark, scatter, color, size, seed };
}

export function shapeWeights(shape: "sphere" | "spiral" | "mark"): [number, number, number] {
  return shape === "sphere" ? [1, 0, 0] : shape === "spiral" ? [0, 1, 0] : [0, 0, 1];
}
