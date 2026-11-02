"use client";

import { useMemo, useReducer, useRef, useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import type { FloorId, HotspotId, MaterialId, Phase, Snapshot, TimeId, ViewMode } from "./types";

export interface BlueprintState {
  phase: Phase;
  replayN: number;
  selectedId: FloorId | null;
  viewMode: ViewMode;
  config: { material: MaterialId; prevMaterial: MaterialId; compare: boolean; time: TimeId; exploded: boolean };
  isAnimating: boolean;
  hotspotId: HotspotId | null;
  focusN: number;
  homeN: number;
  /** -1: 투어 아님, 0~2: 장면, 3: 마지막 문의 안내 */
  tourStep: number;
  tourAuto: boolean;
  history: Snapshot[];
  downgraded: QualityTier | null;
  error: string | null;
}

type Action =
  | { type: "morph" }
  | { type: "ready" }
  | { type: "fail"; error: string }
  | { type: "replay" }
  | { type: "select"; id: FloorId | null }
  | { type: "explode" }
  | { type: "material"; id: MaterialId }
  | { type: "compare" }
  | { type: "time"; id: TimeId }
  | { type: "view"; mode: Exclude<ViewMode, "tour"> }
  | { type: "home" }
  | { type: "hotspot"; id: HotspotId | null }
  | { type: "tour"; step: number }
  | { type: "tourAuto"; on: boolean }
  | { type: "tourStop" }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "animating"; on: boolean }
  | { type: "downgrade"; tier: QualityTier };

export const INITIAL_CONFIG: BlueprintState["config"] = { material: "concrete", prevMaterial: "concrete", compare: false, time: "day", exploded: false };

const initial: BlueprintState = {
  phase: "blueprint",
  replayN: 0,
  selectedId: null,
  viewMode: "iso",
  config: { ...INITIAL_CONFIG },
  isAnimating: false,
  hotspotId: null,
  focusN: 0,
  homeN: 0,
  tourStep: -1,
  tourAuto: false,
  history: [],
  downgraded: null,
  error: null,
};

const snap = (s: BlueprintState): Snapshot => ({ selectedId: s.selectedId, material: s.config.material, time: s.config.time, exploded: s.config.exploded });
const push = (s: BlueprintState): Snapshot[] => [...s.history.slice(-19), snap(s)];
const canAct = (s: BlueprintState) => s.phase === "ready" || s.phase === "fallback";

function reducer(s: BlueprintState, a: Action): BlueprintState {
  switch (a.type) {
    case "morph":
      return s.phase === "blueprint" ? { ...s, phase: "morphing" } : s;
    case "ready":
      return s.phase === "blueprint" || s.phase === "morphing" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, isAnimating: false };
    case "replay":
      return s.phase === "ready"
        ? { ...s, phase: "blueprint", replayN: s.replayN + 1, selectedId: null, hotspotId: null, tourStep: -1, tourAuto: false, viewMode: "iso", homeN: s.homeN + 1, config: { ...s.config, exploded: false } }
        : s;
    case "select": {
      if (!canAct(s)) return s;
      const id = s.selectedId === a.id ? null : a.id;
      return { ...s, history: push(s), selectedId: id, config: { ...s.config, exploded: id !== null } };
    }
    case "explode":
      return canAct(s) ? { ...s, history: push(s), config: { ...s.config, exploded: !s.config.exploded } } : s;
    case "material":
      if (!canAct(s) || s.config.material === a.id) return s;
      return { ...s, history: push(s), config: { ...s.config, prevMaterial: s.config.material, material: a.id, compare: false } };
    case "compare":
      return canAct(s) && s.config.prevMaterial !== s.config.material ? { ...s, config: { ...s.config, compare: !s.config.compare } } : s;
    case "time":
      return canAct(s) && s.config.time !== a.id ? { ...s, history: push(s), config: { ...s.config, time: a.id } } : s;
    case "view":
      return canAct(s) ? { ...s, viewMode: a.mode, tourStep: -1, tourAuto: false } : s;
    case "home":
      return canAct(s) ? { ...s, viewMode: "iso", homeN: s.homeN + 1, tourStep: -1, tourAuto: false } : s;
    case "hotspot":
      return canAct(s) ? { ...s, hotspotId: a.id, focusN: a.id ? s.focusN + 1 : s.focusN } : s;
    case "tour": {
      if (!canAct(s)) return s;
      const step = Math.max(0, Math.min(3, a.step));
      return { ...s, viewMode: "tour", tourStep: step, tourAuto: step < 3 ? s.tourAuto || step === 0 : false };
    }
    case "tourAuto":
      return s.tourStep >= 0 && s.tourStep < 3 ? { ...s, tourAuto: a.on } : s;
    case "tourStop":
      return { ...s, viewMode: "iso", homeN: s.homeN + 1, tourStep: -1, tourAuto: false };
    case "undo": {
      if (!canAct(s) || s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return { ...s, history: s.history.slice(0, -1), selectedId: prev.selectedId, config: { material: prev.material, prevMaterial: prev.material, compare: false, time: prev.time, exploded: prev.exploded } };
    }
    case "reset":
      return canAct(s) ? { ...s, selectedId: null, hotspotId: null, viewMode: "iso", homeN: s.homeN + 1, tourStep: -1, tourAuto: false, history: [], config: { ...INITIAL_CONFIG } } : s;
    case "animating":
      return s.isAnimating === a.on ? s : { ...s, isAnimating: a.on };
    case "downgrade":
      return { ...s, downgraded: a.tier };
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
const detectDeviceTier = (): QualityTier => (window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier());

/** 측정 이벤트: 개인정보 없이 window CustomEvent 로만 내보낸다(analytics adapter 연결 지점). */
export function trackEvent(name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", detail?: Record<string, string | number>) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, ...detail } }));
}

export function useBlueprint() {
  const [state, dispatch] = useReducer(reducer, initial);
  const reduced = useSyncExternalStore(subscribeEnv, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeEnv, detectDeviceTier, () => "medium" as QualityTier);
  const tier: QualityTier = lowerOf(deviceTier, state.downgraded ?? "high");
  const fpsRef = useRef(0);
  const actions = useMemo(
    () => ({
      morph: () => dispatch({ type: "morph" }),
      ready: () => dispatch({ type: "ready" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      replay: () => dispatch({ type: "replay" }),
      select: (id: FloorId | null) => {
        dispatch({ type: "select", id });
        trackEvent("hero_select", { id: id ?? "none" });
      },
      explode: () => dispatch({ type: "explode" }),
      material: (id: MaterialId) => {
        dispatch({ type: "material", id });
        trackEvent("hero_interact", { control: "material", id });
      },
      compare: () => dispatch({ type: "compare" }),
      time: (id: TimeId) => {
        dispatch({ type: "time", id });
        trackEvent("hero_interact", { control: "time", id });
      },
      view: (mode: Exclude<ViewMode, "tour">) => dispatch({ type: "view", mode }),
      home: () => dispatch({ type: "home" }),
      hotspot: (id: HotspotId | null) => dispatch({ type: "hotspot", id }),
      tour: (step: number) => dispatch({ type: "tour", step }),
      tourAuto: (on: boolean) => dispatch({ type: "tourAuto", on }),
      tourStop: () => dispatch({ type: "tourStop" }),
      undo: () => dispatch({ type: "undo" }),
      reset: () => dispatch({ type: "reset" }),
      animating: (on: boolean) => dispatch({ type: "animating", on }),
      downgrade: (t: QualityTier) => dispatch({ type: "downgrade", tier: t }),
    }),
    [],
  );
  return { state, actions, reduced, tier, fpsRef };
}

export type BlueprintActions = ReturnType<typeof useBlueprint>["actions"];
