"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { detectQualityTier, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { TIER_PRESETS, WDTH_RANGE, WGHT_RANGE, type HeroOptions, type HeroState } from "./config";

type Axis = { wght: boolean; wdth: boolean };
type Item = {
  el: HTMLElement;
  x: (v: number) => void;
  y: (v: number) => void;
  s: (v: number) => void;
  w: (v: number) => void;
  d: (v: number) => void;
  cx: number;
  cy: number;
};

type Args = {
  stageRef: RefObject<HTMLDivElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
  options: HeroOptions;
  reducedMotion: boolean;
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 입력 좌표·상태 머신·GSAP 애니메이션을 한곳에서 관리한다. unmount 시 리스너·트윈·타이머를 모두 해제한다. */
export function useHeroInteraction({ stageRef, buttonRef, labelRef, options, reducedMotion }: Args) {
  const [state, setStateRaw] = useState<HeroState>("loading");
  const [axis, setAxis] = useState<Axis>({ wght: false, wdth: false });
  const [tier, setTier] = useState<QualityTier>("high");
  const [fps, setFps] = useState<number | null>(null);

  const stateRef = useRef<HeroState>("loading");
  const optRef = useRef(options);
  const tierRef = useRef<QualityTier>("high");
  const axisRef = useRef<Axis>({ wght: false, wdth: false });
  const introDone = useRef(false);
  const actions = useRef<{ replay: () => void; tap: () => void }>({ replay: () => {}, tap: () => {} });

  useEffect(() => {
    optRef.current = options;
  }, [options]);

  const setState = useCallback((next: HeroState) => {
    stateRef.current = next;
    setStateRaw(next);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const chars = Array.from(stage.querySelectorAll<HTMLElement>("[data-char]"));
    const skewEl = stage.querySelector<HTMLElement>("[data-skew]");
    const btn = buttonRef.current;
    const label = labelRef.current;
    const cleanups: Array<() => void> = [];
    let dead = false;

    try {
      tierRef.current = detectQualityTier();
      setTier(tierRef.current);

      // 가변 폰트 축 확인: 극단값에서 폭이 달라지는지 측정한다.
      const probeAxis = (): Axis => {
        const probe = document.createElement("span");
        probe.textContent = "MWAHg";
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:700 48px var(--font-sans)";
        stage.appendChild(probe);
        const width = (v: string) => {
          probe.style.fontVariationSettings = v;
          return probe.getBoundingClientRect().width;
        };
        const a: Axis = {
          wght: Math.abs(width(`"wght" ${WGHT_RANGE[0]}`) - width(`"wght" ${WGHT_RANGE[1]}`)) > 0.5,
          wdth: Math.abs(width(`"wdth" ${WDTH_RANGE[0]}`) - width(`"wdth" ${WDTH_RANGE[1]}`)) > 0.5,
        };
        probe.remove();
        return a;
      };

      const spring = optRef.current.features.spring;
      const dur = (d: number) => d / Math.max(optRef.current.speed, 0.1);
      const ease = spring ? "elastic.out(1, 0.45)" : "power3.out";
      const items: Item[] = chars.map((el) => {
        const d = dur(spring ? 1.1 : 0.5);
        return {
          el,
          x: gsap.quickTo(el, "x", { duration: d, ease }),
          y: gsap.quickTo(el, "y", { duration: d, ease }),
          s: gsap.quickTo(el, "scale", { duration: d, ease }),
          w: gsap.quickTo(el, "--w", { duration: dur(0.45), ease: "power2.out" }),
          d: gsap.quickTo(el, "--wd", { duration: dur(0.45), ease: "power2.out" }),
          cx: 0,
          cy: 0,
        };
      });
      const skewTo = skewEl ? gsap.quickTo(skewEl, "skewX", { duration: dur(0.6), ease: "power3.out" }) : null;
      const bxTo = btn ? gsap.quickTo(btn, "x", { duration: dur(0.8), ease }) : null;
      const byTo = btn ? gsap.quickTo(btn, "y", { duration: dur(0.8), ease }) : null;
      const lxTo = label ? gsap.quickTo(label, "x", { duration: dur(0.8), ease }) : null;
      const lyTo = label ? gsap.quickTo(label, "y", { duration: dur(0.8), ease }) : null;

      const baseW = WGHT_RANGE[0] + 60;
      const resetVars = () => {
        for (const it of items) {
          it.x(0);
          it.y(0);
          it.s(1);
          it.w(baseW);
          it.d(WDTH_RANGE[0]);
        }
        skewTo?.(0);
        bxTo?.(0);
        byTo?.(0);
        lxTo?.(0);
        lyTo?.(0);
      };

      // 글자 상자 폭을 고정해 weight 변화로 줄바꿈·레이아웃 점프가 생기지 않게 한다.
      const measure = () => {
        for (const it of items) {
          it.el.style.width = "";
          it.el.style.setProperty("--w", String(WGHT_RANGE[0] + 360));
        }
        for (const it of items) it.el.style.width = `${it.el.getBoundingClientRect().width}px`;
        for (const it of items) it.el.style.setProperty("--w", String(baseW));
      };

      const setup = () => {
        axisRef.current = probeAxis();
        setAxis(axisRef.current);
        for (const it of items) gsap.set(it.el, { "--w": baseW, "--wd": WDTH_RANGE[0] });
        measure();
      };

      // ---- 효과 계산 ----
      const pointer = { x: 0, y: 0, vx: 0, t: 0, inside: false };
      let raf = 0;
      let lastFrame = 0;
      const frameMs: number[] = [];
      let skewTimer: gsap.core.Tween | null = null;
      let tapTimer: gsap.core.Tween | null = null;

      const refreshCenters = () => {
        for (const it of items) {
          const r = it.el.getBoundingClientRect();
          it.cx = r.left + r.width / 2 - (Number(gsap.getProperty(it.el, "x")) || 0);
          it.cy = r.top + r.height / 2 - (Number(gsap.getProperty(it.el, "y")) || 0);
        }
      };

      const applyAt = (px: number, py: number, boost = 1) => {
        const o = optRef.current;
        const preset = TIER_PRESETS[tierRef.current];
        const radius = o.radius * preset.radiusScale;
        const useVar = o.features.variable && preset.variable;
        refreshCenters();
        for (const it of items) {
          const dx = px - it.cx;
          const dy = py - it.cy;
          const n = clamp(1 - Math.hypot(dx, dy) / radius, 0, 1); // 정규화 강도 0~1
          const k = clamp(n * n * boost, 0, 1);
          if (o.features.magnet) {
            const pull = k * o.intensity * 0.5;
            it.x(dx * pull);
            it.y(dy * pull);
          } else {
            it.x(0);
            it.y(0);
          }
          if (useVar && (axisRef.current.wght || axisRef.current.wdth)) {
            it.w(axisRef.current.wght ? lerp(baseW, WGHT_RANGE[1], k) : baseW);
            it.d(axisRef.current.wdth ? lerp(WDTH_RANGE[0], WDTH_RANGE[1], k) : WDTH_RANGE[0]);
            it.s(1);
          } else if (o.features.variable) {
            it.s(1 + 0.35 * k * o.intensity); // 축 미지원 폴백: 스케일로 대체
          } else {
            it.s(1);
          }
        }
        if (btn && o.features.button) {
          const r = btn.getBoundingClientRect();
          const bx = r.left + r.width / 2 - (Number(gsap.getProperty(btn, "x")) || 0);
          const by = r.top + r.height / 2 - (Number(gsap.getProperty(btn, "y")) || 0);
          const dx = px - bx;
          const dy = py - by;
          const n = clamp(1 - Math.hypot(dx, dy) / (radius * 0.9 + Math.max(r.width, 120)), 0, 1);
          bxTo?.(dx * n * 0.35); // 버튼 전체
          byTo?.(dy * n * 0.35);
          lxTo?.(dx * n * 0.2); // 내부 라벨(다른 비율)
          lyTo?.(dy * n * 0.2);
        }
      };

      const release = () => {
        pointer.inside = false;
        tapTimer?.kill();
        skewTimer?.kill();
        resetVars();
        if (stateRef.current === "interacting") setState("idle");
      };

      const frame = (now: number) => {
        raf = 0;
        if (!pointer.inside || dead) return;
        if (lastFrame) {
          frameMs.push(now - lastFrame);
          if (frameMs.length >= 60) {
            const avg = frameMs.reduce((a, b) => a + b, 0) / frameMs.length;
            setFps(Math.round(1000 / avg));
            const next = downgradeTier(tierRef.current, avg);
            if (next !== tierRef.current) {
              tierRef.current = next;
              setTier(next);
            }
            frameMs.length = 0;
          }
        }
        lastFrame = now;
        applyAt(pointer.x, pointer.y);
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "touch") return; // 터치는 스크롤과 충돌하지 않도록 탭으로 대체
        const s = stateRef.current;
        if (s !== "idle" && s !== "interacting") return;
        const now = performance.now();
        const dt = Math.max(now - pointer.t, 1);
        pointer.vx = lerp(pointer.vx, ((e.clientX - pointer.x) / dt) * 16, 0.35); // px/frame
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.t = now;
        pointer.inside = true;
        if (s === "idle") setState("interacting");
        if (optRef.current.features.skew && skewTo) {
          skewTo(clamp(-pointer.vx * 0.8, -optRef.current.maxSkew, optRef.current.maxSkew));
          skewTimer?.kill();
          skewTimer = gsap.delayedCall(0.09, () => skewTo(0));
        } else skewTo?.(0);
        schedule();
      };

      const tapAt = (x: number, y: number) => {
        const s = stateRef.current;
        if (s !== "idle" && s !== "interacting") return;
        tapTimer?.kill();
        setState("interacting");
        pointer.inside = true;
        applyAt(x, y, 1.6);
        tapTimer = gsap.delayedCall(0.6, release);
      };

      const onDown = (e: PointerEvent) => {
        if (e.pointerType !== "touch" || !optRef.current.features.touch) return;
        const r = stage.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        tapAt(e.clientX, e.clientY);
      };

      const onLeaveDoc = () => release();
      const onOut = (e: MouseEvent) => {
        if (!e.relatedTarget) release();
      };
      const onVisibility = () => {
        if (document.hidden) release();
      };

      // ---- 인트로 / 전환 ----
      let tl: gsap.core.Timeline | null = null;
      const playIntro = () => {
        tl?.kill();
        release();
        setState(introDone.current ? "transitioning" : "intro");
        const t = gsap.timeline({
          onComplete: () => {
            introDone.current = true;
            if (!dead) setState("idle");
          },
        });
        t.fromTo(
          chars,
          { yPercent: 110, opacity: 0, rotate: 6 },
          {
            yPercent: 0,
            opacity: 1,
            rotate: 0,
            duration: dur(0.9),
            ease: "expo.out",
            stagger: optRef.current.features.stagger ? 0.045 / optRef.current.speed : 0,
          },
        );
        if (btn) t.fromTo(btn, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: dur(0.6), ease: "back.out(1.6)" }, "-=0.4");
        tl = t;
      };

      actions.current = {
        replay: () => {
          const s = stateRef.current;
          if (s === "intro" || s === "transitioning" || s === "loading" || reducedMotion) return;
          playIntro();
        },
        tap: () => {
          const r = stage.getBoundingClientRect();
          tapAt(r.left + r.width * 0.5, r.top + r.height * 0.5);
        },
      };

      // ---- 시작 ----
      let ro: ResizeObserver | null = null;
      const start = () => {
        if (dead) return;
        setup();
        ro = new ResizeObserver(() => {
          if (stateRef.current !== "interacting") measure();
        });
        ro.observe(stage);
        if (reducedMotion) {
          gsap.set(chars, { clearProps: "opacity,transform" });
          introDone.current = true;
          setState("idle");
          return;
        }
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointercancel", onLeaveDoc);
        window.addEventListener("blur", onLeaveDoc);
        document.addEventListener("mouseout", onOut);
        document.addEventListener("visibilitychange", onVisibility);
        if (introDone.current) {
          gsap.set(chars, { opacity: 1 });
          setState("idle");
        } else playIntro();
      };

      let started = false;
      const begin = () => {
        if (started) return;
        started = true;
        start();
      };
      // 폰트가 준비되면 시작, 늦어도 1.2초 뒤엔 시작한다(로딩 표시는 그 사이 노출).
      const timer = window.setTimeout(begin, 1200);
      void document.fonts.ready.then(() => {
        window.clearTimeout(timer);
        begin();
      });

      cleanups.push(() => {
        window.clearTimeout(timer);
        if (raf) cancelAnimationFrame(raf);
        tl?.kill();
        skewTimer?.kill();
        tapTimer?.kill();
        ro?.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointercancel", onLeaveDoc);
        window.removeEventListener("blur", onLeaveDoc);
        document.removeEventListener("mouseout", onOut);
        document.removeEventListener("visibilitychange", onVisibility);
        gsap.killTweensOf([...chars, ...(skewEl ? [skewEl] : []), ...(btn ? [btn] : []), ...(label ? [label] : [])]);
      });
    } catch {
      setState("fallback");
    }

    return () => {
      dead = true;
      cleanups.forEach((fn) => fn());
    };
  }, [stageRef, buttonRef, labelRef, reducedMotion, options.speed, options.features.spring, setState]);

  return {
    state,
    axis,
    tier,
    fps,
    replayIntro: () => actions.current.replay(),
    simulateTap: () => actions.current.tap(),
  };
}
