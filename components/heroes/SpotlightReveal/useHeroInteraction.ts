"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import {
  detectQualityTier,
  downgradeTier,
  prefersReducedMotion,
  subscribeReducedMotion,
  type QualityTier,
} from "@/lib/hero/performance";
import { QUALITY_PRESETS, type Phase, type SpotlightOptions } from "./config";

type Internal = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  r: number;
  scale: number;
  hover: boolean;
  ctaHover: boolean;
  inside: boolean;
  down: boolean;
  locked: boolean;
  placed: boolean;
  tween: gsap.core.Tween | null;
  downAt: { x: number; y: number; t: number };
};

type Api = {
  expand: () => void;
  reset: () => void;
  wake: () => void;
  key: (e: KeyboardEvent) => void;
  ctaHover: (v: boolean) => void;
  padFocus: (v: boolean) => void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** 포인터·키보드 입력 → 지연 추적(lerp) → CSS custom properties(--mx/--my/--rx/--ry) 매핑과 상태 머신. */
export function useHeroInteraction(options: SpotlightOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const optRef = useRef(options);
  const apiRef = useRef<Api | null>(null);
  const [phase, setPhaseState] = useState<Phase>("loading");
  const [swapped, setSwapped] = useState(false);
  const [tier, setTier] = useState<QualityTier>("medium");
  const [reducedMotion, setReduced] = useState(false);
  const [seen, setSeen] = useState<readonly number[]>([]);

  useEffect(() => {
    optRef.current = options;
    apiRef.current?.wake();
  }, [options]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const s: Internal = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      r: 1,
      scale: 1,
      hover: false,
      ctaHover: false,
      inside: false,
      down: false,
      locked: false,
      placed: false,
      tween: null,
      downAt: { x: 0, y: 0, t: 0 },
    };
    let w = 0;
    let h = 0;
    let phaseNow: Phase = "loading";
    let tierNow: QualityTier = "medium";
    let reduced = false;
    let active = false;
    let frameSum = 0;
    let frameN = 0;
    const seenSet = new Set<number>();

    const setPhase = (p: Phase) => {
      if (phaseNow === "fallback" || phaseNow === p) return;
      phaseNow = p;
      setPhaseState(p);
    };
    const mark = (id: number) => {
      if (seenSet.has(id)) return;
      seenSet.add(id);
      setSeen([...seenSet].sort((a, b) => a - b));
    };

    const baseR = () => optRef.current.radius * (w < 520 ? 0.7 : 1);
    const targetR = () => {
      const b = baseR() * s.scale;
      if (s.locked) return b * 2.4;
      if (s.down) return b * 1.3;
      if (s.hover || s.ctaHover) return b * 1.7;
      if (s.inside) return b;
      return b * 0.4;
    };

    const write = (rx: number, ry: number) => {
      stage.style.setProperty("--mx", `${s.x.toFixed(1)}px`);
      stage.style.setProperty("--my", `${s.y.toFixed(1)}px`);
      stage.style.setProperty("--rx", `${Math.max(1, rx).toFixed(1)}px`);
      stage.style.setProperty("--ry", `${Math.max(1, ry).toFixed(1)}px`);
    };

    const sleep = () => {
      if (!active) return;
      active = false;
      gsap.ticker.remove(tick);
    };

    const tick = (_time: number, deltaMs: number) => {
      const o = optRef.current;
      const dt = Math.min(deltaMs, 50) / 1000;
      const f = reduced ? 1 : 1 - Math.pow(1 - clamp(0.1 * o.speed, 0.02, 0.5), dt * 60);
      s.x += (s.tx - s.x) * f;
      s.y += (s.ty - s.y) * f;
      const goal = targetR();
      if (!s.tween) {
        const fr = reduced ? 1 : 1 - Math.pow(1 - clamp(0.14 * o.speed, 0.03, 0.6), dt * 60);
        s.r += (goal - s.r) * fr;
      }
      const lagX = Math.abs(s.tx - s.x);
      const lagY = Math.abs(s.ty - s.y);
      if (Math.max(lagX, lagY) > 6) mark(3);

      let rx = s.r;
      let ry = s.r;
      const preset = QUALITY_PRESETS[tierNow];
      if (!s.tween && !reduced && o.distortion && preset.distortion && o.intensity > 0) {
        const cap = o.intensity * preset.maxStretch;
        const sx = Math.min((lagX / Math.max(s.r, 1)) * o.intensity * 2, cap);
        const sy = Math.min((lagY / Math.max(s.r, 1)) * o.intensity * 2, cap);
        rx = s.r * (1 + sx) * (1 - 0.35 * sy);
        ry = s.r * (1 + sy) * (1 - 0.35 * sx);
        if (Math.max(sx, sy) > 0.12) mark(5);
      }
      write(rx, ry);

      // 프레임 예산 초과 시 품질 한 단계 하향 (올리지 않음)
      frameSum += deltaMs;
      frameN += 1;
      if (frameN >= 90) {
        const next = downgradeTier(tierNow, frameSum / frameN);
        if (next !== tierNow) {
          tierNow = next;
          setTier(next);
        }
        frameSum = 0;
        frameN = 0;
      }

      if (!s.tween && lagX < 0.1 && lagY < 0.1 && Math.abs(goal - s.r) < 0.1) sleep();
    };

    const wake = () => {
      if (active) return;
      active = true;
      frameSum = 0;
      frameN = 0;
      gsap.ticker.add(tick);
    };

    const killTween = () => {
      s.tween?.kill();
      s.tween = null;
    };
    const interrupt = () => {
      if (phaseNow === "intro") {
        killTween();
        setPhase("idle");
        mark(1);
      }
    };
    const touchPhase = () => {
      interrupt();
      if (phaseNow === "idle") setPhase("interacting");
    };

    const measure = () => {
      const b = stage.getBoundingClientRect();
      w = b.width;
      h = b.height;
      if (!s.placed && w > 0) {
        s.x = s.tx = w / 2;
        s.y = s.ty = h / 2;
        s.placed = true;
      } else {
        s.tx = clamp(s.tx, 0, w);
        s.ty = clamp(s.ty, 0, h);
      }
    };

    const setTarget = (cx: number, cy: number) => {
      const b = stage.getBoundingClientRect();
      s.tx = clamp(cx - b.left, 0, b.width);
      s.ty = clamp(cy - b.top, 0, b.height);
    };
    const overChip = (cx: number, cy: number) => {
      for (const el of stage.querySelectorAll("[data-spot]")) {
        const b = el.getBoundingClientRect();
        if (cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom) return true;
      }
      return false;
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      s.inside = true;
      touchPhase();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (phaseNow === "transitioning" || phaseNow === "loading") {
        if (e.pointerType !== "touch") {
          setTarget(e.clientX, e.clientY);
          wake();
        }
        return;
      }
      if (e.pointerType === "touch") {
        if (!s.down || (optRef.current.touchMode === "toggle" && !s.locked)) return;
        mark(7);
      } else {
        s.inside = true;
      }
      setTarget(e.clientX, e.clientY);
      const hov = overChip(e.clientX, e.clientY);
      if (hov && !s.hover) mark(4);
      s.hover = hov;
      mark(2);
      touchPhase();
      wake();
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      s.inside = false;
      s.hover = false;
      if (phaseNow === "interacting") setPhase("idle");
      wake();
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || phaseNow === "transitioning" || phaseNow === "loading") return;
      s.down = true;
      s.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
      stage.setPointerCapture(e.pointerId);
      if (optRef.current.touchMode === "drag") {
        setTarget(e.clientX, e.clientY);
        mark(7);
        mark(2);
      }
      touchPhase();
      wake();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !s.down) return;
      s.down = false;
      const moved = Math.hypot(e.clientX - s.downAt.x, e.clientY - s.downAt.y);
      if (optRef.current.touchMode === "toggle" && moved < 10 && performance.now() - s.downAt.t < 300) {
        setTarget(e.clientX, e.clientY);
        s.locked = !s.locked;
        mark(7);
        mark(2);
      }
      if (phaseNow === "interacting") setPhase("idle");
      wake();
    };
    const onCancel = () => {
      s.down = false;
      if (phaseNow === "interacting") setPhase("idle");
      wake();
    };

    const swapNow = () => {
      s.tween = null;
      s.locked = false;
      flushSync(() => setSwapped((v) => !v));
      s.r = baseR() * 0.4;
      write(s.r, s.r);
      setPhase("idle");
      mark(6);
      wake();
    };

    const expand = () => {
      if (phaseNow === "transitioning" || phaseNow === "loading" || phaseNow === "fallback") return;
      interrupt();
      setPhase("transitioning");
      s.locked = false;
      s.hover = false;
      const far = Math.hypot(Math.max(s.x, w - s.x), Math.max(s.y, h - s.y));
      const full = (far / QUALITY_PRESETS[tierNow].opaqueStop) * 1.05;
      if (reduced) {
        swapNow();
        return;
      }
      s.tween = gsap.to(s, {
        r: full,
        duration: Math.max(0.35, 0.9 / optRef.current.speed),
        ease: "power2.in",
        onComplete: swapNow,
      });
      wake();
    };

    const reset = () => {
      if (phaseNow === "transitioning") return;
      s.tx = w / 2;
      s.ty = h / 2;
      s.scale = 1;
      s.locked = false;
      wake();
    };

    const key = (e: KeyboardEvent) => {
      if (phaseNow === "transitioning" || phaseNow === "loading") return;
      const step = e.shiftKey ? 120 : 40;
      switch (e.key) {
        case "ArrowLeft":
          s.tx -= step;
          break;
        case "ArrowRight":
          s.tx += step;
          break;
        case "ArrowUp":
          s.ty -= step;
          break;
        case "ArrowDown":
          s.ty += step;
          break;
        case "+":
        case "=":
          s.scale = clamp(s.scale * 1.15, 0.5, 2);
          break;
        case "-":
        case "_":
          s.scale = clamp(s.scale / 1.15, 0.5, 2);
          break;
        case "Enter":
        case " ":
          s.locked = !s.locked;
          break;
        case "Escape":
          s.locked = false;
          break;
        default:
          return;
      }
      e.preventDefault();
      s.tx = clamp(s.tx, 0, w);
      s.ty = clamp(s.ty, 0, h);
      s.inside = true;
      mark(7);
      mark(2);
      touchPhase();
      wake();
    };

    apiRef.current = {
      expand,
      reset,
      wake,
      key,
      ctaHover: (v) => {
        s.ctaHover = v;
        if (v) mark(4);
        wake();
      },
      padFocus: (v) => {
        s.inside = v;
        if (v) touchPhase();
        else if (phaseNow === "interacting") setPhase("idle");
        wake();
      },
    };

    measure();
    const ro = new ResizeObserver(() => {
      measure();
      wake();
    });
    ro.observe(stage);

    stage.addEventListener("pointerenter", onEnter);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onCancel);

    const onVisibility = () => {
      if (document.hidden) sleep();
      else wake();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const unsubReduced = subscribeReducedMotion((v) => {
      reduced = v;
      setReduced(v);
      wake();
    });

    const toFallback = () => {
      phaseNow = "fallback";
      setPhaseState("fallback");
    };

    const raf = requestAnimationFrame(() => {
      reduced = prefersReducedMotion();
      setReduced(reduced);
      tierNow = detectQualityTier();
      setTier(tierNow);

      const supported =
        typeof CSS !== "undefined" &&
        (CSS.supports("mask-image", "radial-gradient(#000, transparent)") ||
          CSS.supports("-webkit-mask-image", "radial-gradient(#000, transparent)"));
      if (!supported || w <= 0) {
        toFallback();
        return;
      }
      try {
        if (reduced) {
          s.r = baseR();
          write(s.r, s.r);
          setPhase("idle");
          mark(1);
          wake();
          return;
        }
        s.r = 1;
        write(1, 1);
        setPhase("intro");
        s.tween = gsap.to(s, {
          r: baseR() * 2.2,
          duration: 1.2 / optRef.current.speed,
          ease: "power3.out",
          onComplete: () => {
            s.tween = null;
            if (phaseNow === "intro") {
              setPhase("idle");
              mark(1);
            }
          },
        });
        wake();
      } catch {
        toFallback();
      }
    });

    return () => {
      cancelAnimationFrame(raf);
      killTween();
      sleep();
      ro.disconnect();
      unsubReduced();
      document.removeEventListener("visibilitychange", onVisibility);
      stage.removeEventListener("pointerenter", onEnter);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onCancel);
      apiRef.current = null;
    };
  }, []);

  const expand = useCallback(() => apiRef.current?.expand(), []);
  const reset = useCallback(() => apiRef.current?.reset(), []);
  const onKeyDown = useCallback((e: KeyboardEvent) => apiRef.current?.key(e), []);
  const ctaHover = useCallback((v: boolean) => apiRef.current?.ctaHover(v), []);
  const padFocus = useCallback((v: boolean) => apiRef.current?.padFocus(v), []);

  return { stageRef, phase, swapped, tier, reducedMotion, seen, expand, reset, onKeyDown, ctaHover, padFocus };
}
