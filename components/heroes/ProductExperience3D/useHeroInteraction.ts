"use client";

import { useMemo, useReducer, useRef, useSyncExternalStore } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion } from "@/lib/hero/performance";
import { HERO_DEFAULTS, type FinishOption, type PartId } from "./config";

export type Phase = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";
export type QualityMode = "auto" | QualityTier;

export interface HeroState {
  phase: Phase;
  finishId: string;
  roughness: number;
  metalness: number;
  exploded: boolean;
  selected: PartId | null;
  qualityMode: QualityMode;
  /** 프레임 모니터가 낮춘 상한. null이면 하향 없음 */
  downgraded: QualityTier | null;
  speed: number;
  intensity: number;
  nudge: { dir: number; n: number };
  resetN: number;
  error: string | null;
}

type Action =
  | { type: "ready" }
  | { type: "introDone" }
  | { type: "interact"; on: boolean }
  | { type: "transitionDone" }
  | { type: "fail"; error: string }
  | { type: "finish"; finish: FinishOption }
  | { type: "material"; key: "roughness" | "metalness"; value: number }
  | { type: "explode"; value?: boolean }
  | { type: "select"; id: PartId | null }
  | { type: "quality"; mode: QualityMode }
  | { type: "downgrade"; tier: QualityTier }
  | { type: "hero"; key: "speed" | "intensity"; value: number }
  | { type: "nudge"; dir: number }
  | { type: "reset" };

const canAct = (p: Phase) => p === "idle" || p === "interacting";

function reducer(s: HeroState, a: Action): HeroState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "idle" } : s;
    case "interact":
      if (a.on) return s.phase === "idle" ? { ...s, phase: "interacting" } : s;
      return s.phase === "interacting" ? { ...s, phase: "idle" } : s;
    case "transitionDone":
      return s.phase === "transitioning" ? { ...s, phase: "idle" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error };
    // 전환 중·인트로 중에는 옵션 변경을 거부해 상태 충돌을 막는다
    case "finish":
      if (!canAct(s.phase) || s.finishId === a.finish.id) return s;
      return { ...s, phase: "transitioning", finishId: a.finish.id, roughness: a.finish.roughness, metalness: a.finish.metalness };
    case "explode":
      if (!canAct(s.phase)) return s;
      return { ...s, phase: "transitioning", exploded: a.value ?? !s.exploded };
    case "material":
      return s.phase === "fallback" ? s : { ...s, [a.key]: a.value };
    case "select":
      return canAct(s.phase) || s.phase === "fallback" ? { ...s, selected: s.selected === a.id ? null : a.id } : s;
    case "quality":
      return { ...s, qualityMode: a.mode, downgraded: null };
    case "downgrade":
      return { ...s, downgraded: a.tier };
    case "hero":
      return { ...s, [a.key]: a.value };
    case "nudge":
      return canAct(s.phase) ? { ...s, nudge: { dir: a.dir, n: s.nudge.n + 1 } } : s;
    case "reset":
      return canAct(s.phase) ? { ...s, resetN: s.resetN + 1, selected: null } : s;
  }
}

const TIER_ORDER: QualityTier[] = ["low", "medium", "high"];
const lowerOf = (a: QualityTier, b: QualityTier) => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);

const MOBILE_MQ = "(max-width: 767px)";
function subscribeEnv(cb: () => void) {
  const off = subscribeReducedMotion(cb);
  const mq = window.matchMedia(MOBILE_MQ);
  mq.addEventListener("change", cb);
  return () => {
    off();
    mq.removeEventListener("change", cb);
  };
}
/** 장치 기준 품질 등급. 모바일(~767)은 항상 low. */
function detectDeviceTier(): QualityTier {
  return window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier();
}

export function useHeroInteraction(initialFinish: FinishOption) {
  const [state, dispatch] = useReducer(reducer, {
    phase: "loading",
    finishId: initialFinish.id,
    roughness: initialFinish.roughness,
    metalness: initialFinish.metalness,
    exploded: false,
    selected: null,
    qualityMode: "auto",
    downgraded: null,
    speed: HERO_DEFAULTS.speed,
    intensity: HERO_DEFAULTS.intensity,
    nudge: { dir: 0, n: 0 },
    resetN: 0,
    error: null,
  } satisfies HeroState);

  const reduced = useSyncExternalStore(subscribeEnv, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeEnv, detectDeviceTier, () => "medium" as QualityTier);
  const tier: QualityTier = state.qualityMode === "auto" ? lowerOf(deviceTier, state.downgraded ?? "high") : state.qualityMode;
  /** 프레임 시간 기반 FPS (Scene이 갱신, Controls가 주기적으로 읽는다) */
  const fpsRef = useRef(0);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      introDone: () => dispatch({ type: "introDone" }),
      interact: (on: boolean) => dispatch({ type: "interact", on }),
      transitionDone: () => dispatch({ type: "transitionDone" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      setFinish: (finish: FinishOption) => dispatch({ type: "finish", finish }),
      setMaterial: (key: "roughness" | "metalness", value: number) => dispatch({ type: "material", key, value }),
      toggleExplode: (value?: boolean) => dispatch({ type: "explode", value }),
      select: (id: PartId | null) => dispatch({ type: "select", id }),
      setQuality: (mode: QualityMode) => dispatch({ type: "quality", mode }),
      downgrade: (t: QualityTier) => dispatch({ type: "downgrade", tier: t }),
      setHero: (key: "speed" | "intensity", value: number) => dispatch({ type: "hero", key, value }),
      nudge: (dir: number) => dispatch({ type: "nudge", dir }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [],
  );

  return { state, actions, reduced, tier, fpsRef };
}

export type HeroActions = ReturnType<typeof useHeroInteraction>["actions"];
