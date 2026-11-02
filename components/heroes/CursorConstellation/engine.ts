import gsap from "gsap";
import type { QualityTier } from "@/lib/hero/performance";
import { PRESETS, REF_AREA, type HeroSettings, type Phase, type PointerState } from "./config";

const BUCKETS = 4;
const TRAIL_TTL = 0.8;

interface EngineOptions {
  ctx: CanvasRenderingContext2D;
  colorSource: HTMLElement;
  getSettings: () => HeroSettings;
  getBrandText: () => string;
  onPhase: (p: Phase) => void;
  reduced: boolean;
}

/** Canvas 2D 입자 시뮬레이션. React 비의존. dispose()로 gsap 트윈·참조를 정리한다. */
export class ConstellationEngine {
  private w = 0;
  private h = 0;
  private dpr = 1;
  private n = 0;
  private builtDensity = -1;
  private builtTier: QualityTier | null = null;
  private x = new Float32Array(0);
  private y = new Float32Array(0);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private hx = new Float32Array(0);
  private hy = new Float32Array(0);
  private tx = new Float32Array(0);
  private ty = new Float32Array(0);
  private ph = new Float32Array(0);
  private head = new Int32Array(0);
  private next = new Int32Array(0);
  private cols = 0;
  private rows = 0;
  private segs = new Float32Array(0);
  private segB = new Uint8Array(0);
  private segN = 0;
  private trail = new Float32Array(0);
  private trailHead = 0;
  private ctl = { intro: 0, pull: 0 };
  private tl: gsap.core.Tween | gsap.core.Timeline | null = null;
  private introTween: gsap.core.Tween | null = null;
  private time = 0;
  private frame = 0;
  private phase: Phase = "loading";
  private locked = false;
  private colors = { accent: "#3fd0bd", fg: "#eef0f3" };
  tier: QualityTier = "medium";
  stats = { edges: 0, pairChecks: 0 };

  constructor(private o: EngineOptions) {
    this.setTier("medium");
  }

  get particleCount() {
    return this.n;
  }
  get currentDpr() {
    return this.dpr;
  }
  get isLocked() {
    return this.locked;
  }

  private setPhase(p: Phase) {
    if (this.phase === p) return;
    this.phase = p;
    this.o.onPhase(p);
  }

  setTier(t: QualityTier) {
    this.tier = t;
    this.trail = new Float32Array(PRESETS[t].trailMax * 5);
    this.trailHead = 0;
  }

  resize(w: number, h: number, dpr: number) {
    if (w < 2 || h < 2) return;
    const canvas = this.o.ctx.canvas;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const had = this.n > 0 && this.w > 0;
    const sx = had ? w / this.w : 1;
    const sy = had ? h / this.h : 1;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    if (!had) {
      this.build();
      return;
    }
    for (let i = 0; i < this.n; i++) {
      this.x[i] *= sx;
      this.hx[i] *= sx;
      this.y[i] *= sy;
      this.hy[i] *= sy;
    }
    this.sampleLogo();
    if (this.o.reduced) {
      this.settle();
      this.draw();
    }
  }

  private targetCount(): number {
    const s = this.o.getSettings();
    const area = Math.min(Math.max((this.w * this.h) / REF_AREA, 0.3), 1.4);
    return Math.min(Math.max(Math.round(PRESETS[this.tier].count * s.density * area), 24), 900);
  }

  /** 입자 초기화: 지터 격자로 균일 분포. */
  private build() {
    const s = this.o.getSettings();
    const n = this.targetCount();
    this.n = n;
    this.builtDensity = s.density;
    this.builtTier = this.tier;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.hx = new Float32Array(n);
    this.hy = new Float32Array(n);
    this.tx = new Float32Array(n);
    this.ty = new Float32Array(n);
    this.ph = new Float32Array(n);
    this.next = new Int32Array(n);
    const cols = Math.max(1, Math.round(Math.sqrt((n * this.w) / this.h)));
    const rows = Math.ceil(n / cols);
    const cw = this.w / cols;
    const ch = this.h / rows;
    for (let i = 0; i < n; i++) {
      const gx = (i % cols) + 0.15 + Math.random() * 0.7;
      const gy = Math.floor(i / cols) + 0.15 + Math.random() * 0.7;
      this.hx[i] = gx * cw;
      this.hy[i] = gy * ch;
      this.x[i] = this.hx[i];
      this.y[i] = this.hy[i];
      this.ph[i] = Math.random() * Math.PI * 2;
    }
    this.segs = new Float32Array(n * 8 * 4);
    this.segB = new Uint8Array(n * 8);
    this.sampleLogo();
    if (this.o.reduced) {
      this.settle();
      this.draw();
    }
  }

  /** 오프스크린 캔버스에 브랜드 텍스트를 그려 픽셀 샘플링 -> 입자 목표 좌표. */
  private sampleLogo() {
    const { w, h, n } = this;
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.floor(w));
    off.height = Math.max(1, Math.floor(h));
    const c = off.getContext("2d", { willReadFrequently: true });
    if (!c) return;
    const text = this.o.getBrandText() || "CC";
    let size = h * 0.5;
    c.font = `800 ${size}px system-ui, sans-serif`;
    const mw = c.measureText(text).width;
    if (mw > w * 0.8) size *= (w * 0.8) / mw;
    c.font = `800 ${size}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(text, w / 2, h / 2);
    const data = c.getImageData(0, 0, off.width, off.height).data;
    let step = 5;
    let pts: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      pts = [];
      for (let py = 0; py < off.height; py += step) {
        for (let px = 0; px < off.width; px += step) {
          if (data[(py * off.width + px) * 4 + 3] > 128) pts.push(px, py);
        }
      }
      if (pts.length / 2 <= n * 1.2) break;
      step = Math.ceil(step * 1.3);
    }
    const m = pts.length / 2;
    if (m === 0) {
      this.tx.set(this.hx);
      this.ty.set(this.hy);
      return;
    }
    const order = Array.from({ length: m }, (_, i) => i);
    for (let i = m - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < n; i++) {
      const k = order[i % m];
      const jitter = i >= m ? (Math.random() - 0.5) * 4 : 0;
      this.tx[i] = pts[k * 2] + jitter;
      this.ty[i] = pts[k * 2 + 1] + jitter;
    }
  }

  /** 인트로 시작(감소 모션이면 즉시 완료). */
  startIntro() {
    if (this.o.reduced) {
      this.ctl.intro = 1;
      this.setPhase("idle");
      this.draw();
      return;
    }
    this.setPhase("intro");
    this.introTween = gsap.to(this.ctl, {
      intro: 1,
      duration: 1.4,
      ease: "power2.out",
      onComplete: () => {
        if (this.phase === "intro") this.setPhase("idle");
      },
    });
  }

  fail() {
    this.tl?.kill();
    this.introTween?.kill();
    this.setPhase("error");
  }

  private canAct() {
    return this.phase !== "loading" && this.phase !== "intro" && this.phase !== "error";
  }

  /** 클릭 폭발 -> 재집결 -> 해제. 새 클릭은 진행 중 시퀀스를 대체(단일 타임라인이라 충돌 없음). */
  burst(px: number, py: number) {
    if (!this.canAct()) return;
    if (this.o.reduced) {
      this.toggleLogo();
      return;
    }
    this.tl?.kill();
    this.setPhase("transitioning");
    const s = this.o.getSettings();
    const R = 260 * (0.6 + 0.6 * s.intensity);
    for (let i = 0; i < this.n; i++) {
      let dx = this.x[i] - px;
      let dy = this.y[i] - py;
      let d = Math.hypot(dx, dy);
      if (d < 1) {
        const a = Math.random() * Math.PI * 2;
        dx = Math.cos(a);
        dy = Math.sin(a);
        d = 1;
      }
      const f = Math.max(0, 1 - d / R);
      const k = (f ** 1.2 * 900 * s.intensity) / d;
      this.vx[i] += dx * k;
      this.vy[i] += dy * k;
    }
    this.ctl.pull = 0;
    const tl = gsap.timeline({
      onComplete: () => {
        if (this.phase === "transitioning") this.setPhase("idle");
      },
    });
    tl.to(this.ctl, { pull: 1, duration: 0.8, delay: 0.6, ease: "power2.inOut" });
    if (!this.locked) tl.to(this.ctl, { pull: 0, duration: 0.7, delay: 1.4, ease: "power2.inOut" });
    this.tl = tl;
  }

  burstCenter() {
    this.burst(this.w / 2, this.h / 2);
  }

  /** 브랜드 문양 고정/해제. 반환: 고정 여부. */
  toggleLogo(): boolean {
    if (!this.canAct()) return this.locked;
    this.locked = !this.locked;
    this.tl?.kill();
    if (this.o.reduced) {
      this.ctl.pull = this.locked ? 1 : 0;
      this.settle();
      this.draw();
      return this.locked;
    }
    this.setPhase("transitioning");
    this.tl = gsap.to(this.ctl, {
      pull: this.locked ? 1 : 0,
      duration: 1,
      ease: "power2.inOut",
      onComplete: () => {
        if (this.phase === "transitioning") this.setPhase("idle");
      },
    });
    return this.locked;
  }

  reset() {
    this.tl?.kill();
    this.locked = false;
    this.ctl.pull = 0;
    if (this.canAct()) this.setPhase("idle");
    if (this.n > 0) this.build();
  }

  /** 감소 모션: 애니메이션 없이 시뮬레이션을 즉시 수렴시켜 정적 프레임을 만든다. */
  private settle() {
    this.ctl.intro = 1;
    for (let i = 0; i < 120; i++) this.step(1 / 60, null);
  }

  /** 설정 변경 반영(감소 모션에서는 루프가 없으므로 직접 다시 그린다). */
  refresh() {
    if (this.n === 0 || !this.o.reduced) return;
    if (this.builtDensity !== this.o.getSettings().density) this.build();
    else {
      this.step(0, null);
      this.draw();
    }
  }

  step(dtRaw: number, ptr: PointerState | null) {
    if (this.n === 0) return;
    const s = this.o.getSettings();
    if (this.builtDensity !== s.density || this.builtTier !== this.tier) this.build();
    const { n, w, h } = this;
    const dt = dtRaw * s.speed;
    this.time += dt;
    const nowMs = performance.now();
    const active = !!ptr && ptr.inside;

    if (ptr) {
      const decay = Math.exp(-dtRaw * 6);
      ptr.vx *= decay;
      ptr.vy *= decay;
      if (this.phase === "idle" || this.phase === "interacting") {
        this.setPhase(active && nowMs - ptr.lastMove < 1500 ? "interacting" : "idle");
      }
    }

    const pull = this.ctl.pull;
    const intro = this.ctl.intro;
    const homeK = (0.4 + (1 - intro) * 3) * (1 - pull);
    const damp = Math.exp(-(1.2 + 3.8 * pull) * dt);
    const sign = s.forceMode === "attract" ? 1 : -1;
    const R = 140 + 60 * s.intensity;
    const { x, y, vx, vy, hx, hy, tx, ty, ph } = this;
    const t = this.time;

    for (let i = 0; i < n; i++) {
      let ax = (hx[i] - x[i]) * homeK + Math.sin(t * 0.6 + ph[i]) * 14;
      let ay = (hy[i] - y[i]) * homeK + Math.cos(t * 0.5 + ph[i] * 1.3) * 14;
      if (pull > 0) {
        ax += (tx[i] - x[i]) * 14 * pull;
        ay += (ty[i] - y[i]) * 14 * pull;
      }
      if (active && ptr) {
        const dx = ptr.x - x[i];
        const dy = ptr.y - y[i];
        const d = Math.hypot(dx, dy);
        if (d < R && d > 0.5) {
          const f = (1 - d / R) ** 2 * 900 * s.intensity * Math.min(1, d / 30) * sign * (1 - pull * 0.7);
          ax += (dx / d) * f;
          ay += (dy / d) * f;
        }
      }
      vx[i] = (vx[i] + ax * dt) * damp;
      vy[i] = (vy[i] + ay * dt) * damp;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
      if (x[i] < 0) {
        x[i] = 0;
        vx[i] = -vx[i] * 0.5;
      } else if (x[i] > w) {
        x[i] = w;
        vx[i] = -vx[i] * 0.5;
      }
      if (y[i] < 0) {
        y[i] = 0;
        vy[i] = -vy[i] * 0.5;
      } else if (y[i] > h) {
        y[i] = h;
        vy[i] = -vy[i] * 0.5;
      }
    }

    // 궤적 파티클: 수명 관리 + 포인터 속도 기반 생성
    const tr = this.trail;
    const cap = tr.length / 5;
    for (let k = 0; k < cap; k++) {
      const o = k * 5;
      if (tr[o + 4] <= 0) continue;
      tr[o + 4] -= dtRaw / TRAIL_TTL;
      tr[o] += tr[o + 2] * dtRaw;
      tr[o + 1] += tr[o + 3] * dtRaw;
    }
    if (ptr && active && s.showTrail && !this.o.reduced && cap > 0) {
      const speed = Math.hypot(ptr.vx, ptr.vy);
      if (speed > 60) {
        const count = Math.min(3, Math.floor(speed / 250) + 1);
        for (let c = 0; c < count; c++) {
          const o = this.trailHead * 5;
          this.trailHead = (this.trailHead + 1) % cap;
          tr[o] = ptr.x + (Math.random() - 0.5) * 8;
          tr[o + 1] = ptr.y + (Math.random() - 0.5) * 8;
          tr[o + 2] = ptr.vx * 0.06 + (Math.random() - 0.5) * 30;
          tr[o + 3] = ptr.vy * 0.06 + (Math.random() - 0.5) * 30;
          tr[o + 4] = 1;
        }
      }
    }

    this.buildEdges(ptr && active ? ptr : null, s);
  }

  /** uniform grid로 근접 쌍만 검사 (O(n*k)). */
  private buildEdges(ptr: PointerState | null, s: HeroSettings) {
    this.segN = 0;
    this.stats.edges = 0;
    this.stats.pairChecks = 0;
    if (!s.showEdges) return;
    const L = Math.max(30, s.linkDistance);
    const cols = Math.ceil(this.w / L) + 1;
    const rows = Math.ceil(this.h / L) + 1;
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols;
      this.rows = rows;
      this.head = new Int32Array(cols * rows);
    }
    this.head.fill(-1);
    const { n, x, y, head, next, segs, segB } = this;
    for (let i = 0; i < n; i++) {
      const c = Math.floor(x[i] / L) + Math.floor(y[i] / L) * cols;
      next[i] = head[c];
      head[c] = i;
    }
    const maxSeg = segB.length;
    const L2 = L * L;
    let checks = 0;
    let sn = 0;
    // alpha = (1 - d/L) 를 버킷으로 양자화(거리 기반 fade)
    const push = (x1: number, y1: number, x2: number, y2: number, d2: number, lim2: number, boost: number) => {
      if (sn >= maxSeg) return;
      const a = (1 - Math.sqrt(d2 / lim2)) * boost;
      segs[sn * 4] = x1;
      segs[sn * 4 + 1] = y1;
      segs[sn * 4 + 2] = x2;
      segs[sn * 4 + 3] = y2;
      segB[sn] = Math.min(BUCKETS - 1, Math.floor(a * BUCKETS));
      sn++;
    };
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(x[i] / L);
      const cy = Math.floor(y[i] / L);
      for (let oy = -1; oy <= 1; oy++) {
        const gy = cy + oy;
        if (gy < 0 || gy >= rows) continue;
        for (let ox = -1; ox <= 1; ox++) {
          const gx = cx + ox;
          if (gx < 0 || gx >= cols) continue;
          for (let j = head[gx + gy * cols]; j !== -1; j = next[j]) {
            if (j <= i) continue;
            checks++;
            const dx = x[i] - x[j];
            const dy = y[i] - y[j];
            const d2 = dx * dx + dy * dy;
            if (d2 < L2) push(x[i], y[i], x[j], y[j], d2, L2, 1);
          }
        }
      }
    }
    if (ptr) {
      const PL = L * 1.5;
      const PL2 = PL * PL;
      for (let i = 0; i < n; i++) {
        const dx = x[i] - ptr.x;
        const dy = y[i] - ptr.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PL2) push(ptr.x, ptr.y, x[i], y[i], d2, PL2, 1.6);
      }
    }
    this.segN = sn;
    this.stats.edges = sn;
    this.stats.pairChecks = checks;
  }

  draw() {
    const { ctx } = this.o;
    const s = this.o.getSettings();
    if (this.frame++ % 30 === 0) this.readColors();
    const intro = this.ctl.intro;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    // 인트로 확산은 시뮬레이션이 아니라 intro 값의 함수로 그려 프레임 속도와 무관하게 전체 영역에 수렴시킨다.
    const k = 0.2 + 0.8 * intro;
    const d = this.dpr;
    ctx.setTransform(d * k, 0, 0, d * k, d * (this.w / 2) * (1 - k), d * (this.h / 2) * (1 - k));
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.colors.accent;
    const base = 0.55 * (0.5 + 0.5 * s.intensity) * intro * intro;
    const { segs, segB, segN } = this;
    for (let b = 0; b < BUCKETS; b++) {
      ctx.globalAlpha = Math.min(1, base * ((b + 0.5) / BUCKETS) * 2);
      ctx.beginPath();
      for (let k = 0; k < segN; k++) {
        if (segB[k] !== b) continue;
        ctx.moveTo(segs[k * 4], segs[k * 4 + 1]);
        ctx.lineTo(segs[k * 4 + 2], segs[k * 4 + 3]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 0.85 * intro;
    ctx.fillStyle = this.colors.fg;
    ctx.beginPath();
    const r = 1.6;
    for (let i = 0; i < this.n; i++) {
      ctx.moveTo(this.x[i] + r, this.y[i]);
      ctx.arc(this.x[i], this.y[i], r, 0, Math.PI * 2);
    }
    ctx.fill();
    if (s.showTrail) {
      ctx.fillStyle = this.colors.accent;
      const tr = this.trail;
      for (let k = 0; k < tr.length / 5; k++) {
        const life = tr[k * 5 + 4];
        if (life <= 0) continue;
        ctx.globalAlpha = life * 0.9;
        ctx.beginPath();
        ctx.arc(tr[k * 5], tr[k * 5 + 1], 1 + 2.2 * life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private readColors() {
    const cs = getComputedStyle(this.o.colorSource);
    const a = cs.getPropertyValue("--hero-accent").trim();
    const f = cs.getPropertyValue("--hero-fg").trim();
    if (a) this.colors.accent = a;
    if (f) this.colors.fg = f;
  }

  dispose() {
    this.tl?.kill();
    this.introTween?.kill();
    this.tl = null;
    this.introTween = null;
  }
}
