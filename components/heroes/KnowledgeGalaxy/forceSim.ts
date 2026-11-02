import type { GraphModel } from "./graphModel";

// 3D force simulation (렌더링과 분리). d3-force 방식: alpha 감쇠 + 속도 감쇠, alpha < alphaMin 이면 자동 정지.
export class ForceSim {
  readonly pos: Float32Array;
  private vel: Float32Array;
  private pinned: Uint8Array;
  alpha = 1;
  readonly alphaMin = 0.012;

  constructor(private model: GraphModel) {
    const { n, hop } = model;
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.pinned = new Uint8Array(n);
    // 결정적 초기 배치: hop별 구면 위 피보나치 분포
    for (let i = 0; i < n; i++) {
      const r = hop[i] * 2.6;
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / (n + 1));
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      this.pos[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      this.pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      this.pos[i * 3 + 2] = r * Math.cos(phi);
    }
    for (let i = 0; i < 260; i++) this.tick();
  }

  get running(): boolean {
    return this.alpha >= this.alphaMin;
  }

  reheat(alpha = 0.6) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  pin(i: number, x: number, y: number, z: number) {
    this.pinned[i] = 1;
    this.pos[i * 3] = x;
    this.pos[i * 3 + 1] = y;
    this.pos[i * 3 + 2] = z;
  }

  unpin(i: number) {
    this.pinned[i] = 0;
  }

  /** 한 스텝. 정지 상태면 false. */
  tick(): boolean {
    if (!this.running) return false;
    const { n, m, edgeA, edgeB } = this.model;
    const p = this.pos;
    const v = this.vel;
    const a = this.alpha;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = p[i * 3] - p[j * 3];
        const dy = p[i * 3 + 1] - p[j * 3 + 1];
        const dz = p[i * 3 + 2] - p[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz + 0.05;
        const f = (5 * a) / (d2 * Math.sqrt(d2));
        v[i * 3] += dx * f;
        v[i * 3 + 1] += dy * f;
        v[i * 3 + 2] += dz * f;
        v[j * 3] -= dx * f;
        v[j * 3 + 1] -= dy * f;
        v[j * 3 + 2] -= dz * f;
      }
    }
    for (let k = 0; k < m; k++) {
      const i = edgeA[k];
      const j = edgeB[k];
      const dx = p[j * 3] - p[i * 3];
      const dy = p[j * 3 + 1] - p[i * 3 + 1];
      const dz = p[j * 3 + 2] - p[i * 3 + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-4;
      const f = ((d - 2.2) / d) * 0.12 * a;
      v[i * 3] += dx * f;
      v[i * 3 + 1] += dy * f;
      v[i * 3 + 2] += dz * f;
      v[j * 3] -= dx * f;
      v[j * 3 + 1] -= dy * f;
      v[j * 3 + 2] -= dz * f;
    }
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 3; c++) {
        const o = i * 3 + c;
        v[o] -= p[o] * 0.03 * a; // 중심 인력
        v[o] = Math.max(-0.6, Math.min(0.6, v[o])) * 0.6;
        if (!this.pinned[i]) p[o] += v[o];
        else v[o] = 0;
      }
    }
    this.alpha += (0 - this.alpha) * 0.0228;
    return true;
  }
}
