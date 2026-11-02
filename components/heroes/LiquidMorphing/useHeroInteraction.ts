"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import gsap from "gsap";
import { detectQualityTier, downgradeTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import {
  BASE_LIVE,
  DEFAULT_SETTINGS,
  INTRO_FROM,
  PRESETS,
  type HeroState,
  type LiveValues,
  type PointerState,
  type PresetId,
  type Settings,
} from "./config";

const noopSubscribe = () => () => {};
const subscribeReduced = (cb: () => void) => subscribeReducedMotion(() => cb());

/** 입력 좌표·상태 머신·GSAP 타임라인. 렌더 루프가 읽는 값은 ref로, UI가 읽는 값은 state로 분리한다. */
export function useHeroInteraction(stageRef: RefObject<HTMLDivElement | null>, initial?: Partial<Settings>) {
  const [state, setStateRaw] = useState<HeroState>("loading");
  const stateRef = useRef<HeroState>("loading");
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, ...initial });
  const [autoTier, setAutoTier] = useState<QualityTier | null>(null);
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState<{ fps: number; ms: number } | null>(null);

  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);

  const live = useRef<LiveValues>({ ...BASE_LIVE });
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: false, press: 0 });
  const scroll = useRef({ progress: 0 });
  const tl = useRef<gsap.core.Timeline | null>(null);

  const setState = useCallback((s: HeroState) => {
    stateRef.current = s;
    setStateRaw(s);
  }, []);

  const baseTier: QualityTier = autoTier ?? (mounted ? detectQualityTier() : "medium");
  const tier: QualityTier = settings.quality === "auto" ? baseTier : settings.quality;

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  // 인터랙션 6: GSAP 타임라인. 새 타임라인 시작 전에 이전 것을 kill해 상태 충돌을 막는다.
  const play = useCallback(
    (to: LiveValues, opts: { from?: LiveValues; duration: number; during: HeroState }) => {
      tl.current?.kill();
      if (reduced) {
        Object.assign(live.current, to);
        setState("idle");
        setTick((n) => n + 1);
        return;
      }
      if (opts.from) Object.assign(live.current, opts.from);
      setState(opts.during);
      tl.current = gsap
        .timeline({ onComplete: () => setState("idle") })
        .to(live.current, { ...to, duration: opts.duration, ease: "power3.inOut" });
    },
    [reduced, setState],
  );

  const replayIntro = useCallback(() => {
    play({ ...BASE_LIVE }, { from: INTRO_FROM, duration: 2.2, during: "intro" });
  }, [play]);

  const runPreset = useCallback(
    (id: PresetId) => {
      const p = PRESETS.find((x) => x.id === id);
      if (p) play({ ...p.values }, { duration: 1.6, during: "transitioning" });
    },
    [play],
  );

  const onReady = useCallback(() => {
    if (stateRef.current === "loading") replayIntro();
  }, [replayIntro]);

  const onFallback = useCallback(() => {
    tl.current?.kill();
    setState("fallback");
  }, [setState]);

  const retry = useCallback(() => {
    Object.assign(live.current, BASE_LIVE);
    setState("loading");
  }, [setState]);

  // 클릭 대체(키보드): 펄스
  const pulse = useCallback(() => {
    const ptr = pointer.current;
    gsap.killTweensOf(ptr, "press");
    gsap.fromTo(ptr, { press: 1 }, { press: 0, duration: 1, ease: "power2.out" });
    setTick((n) => n + 1);
  }, []);

  const onFps = useCallback((fps: number, ms: number) => {
    setStats({ fps, ms });
    setAutoTier((cur) => downgradeTier(cur ?? detectQualityTier(), ms));
  }, []);

  // 인터랙션 3: 포인터 → NDC. 드래그/클릭은 press 값으로.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ptr = pointer.current;
    let idle: number | undefined;
    const ndc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      return { x, y, inside: Math.abs(x) <= 1 && Math.abs(y) <= 1 };
    };
    const wake = () => {
      const s = stateRef.current;
      if (s !== "idle" && s !== "interacting") return; // intro·transitioning 중에는 상태를 바꾸지 않는다
      setState("interacting");
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        if (stateRef.current === "interacting") setState("idle");
      }, 1200);
    };
    const setPress = (v: number) => gsap.to(ptr, { press: v, duration: v ? 0.25 : 0.8, ease: "power2.out", overwrite: true });
    const move = (e: PointerEvent) => {
      const n = ndc(e);
      ptr.active = n.inside;
      if (n.inside) {
        ptr.x = n.x;
        ptr.y = n.y;
        wake();
      }
    };
    const down = (e: PointerEvent) => {
      if (ndc(e).inside) {
        setPress(1);
        wake();
      }
    };
    const up = () => setPress(0);
    const leave = () => {
      ptr.active = false;
      setPress(0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", leave);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", leave);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.clearTimeout(idle);
      gsap.killTweensOf(ptr);
    };
  }, [stageRef, setState]);

  // 인터랙션 5: 스크롤 진행도(히어로 높이 기준 0~1)
  useEffect(() => {
    const el = stageRef.current?.closest("section");
    if (!el) return;
    const prog = scroll.current;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const h = el.getBoundingClientRect().height || 1;
      prog.progress = Math.min(Math.max(window.scrollY / (h * 0.9), 0), 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(calc);
    };
    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stageRef]);

  // 언마운트 시 타임라인 정리
  useEffect(() => {
    return () => {
      tl.current?.kill();
    };
  }, []);

  return { state, settings, update, tier, reduced, mounted, tick, stats, live, pointer, scroll, runPreset, replayIntro, pulse, onReady, onFallback, onFps, retry };
}
