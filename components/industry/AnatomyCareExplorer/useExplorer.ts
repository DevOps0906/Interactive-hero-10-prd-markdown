"use client";

import { useCallback, useEffect, useMemo, useReducer, useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { BOOKING_PATH, REGION_IDS, VIEW_PRESETS, getRegion } from "./config";
import type { LayerId, LayerValues, Phase, RegionId, ViewMode } from "./types";

/** 단일 상태 소유자. HTML 패널과 3D 장면이 모두 이 상태에서 파생된다. */
export interface ExplorerState {
  phase: Phase;
  error: string | null;
  selectedId: RegionId | null;
  /** 되돌리기용 이전 선택(최근 순서 끝). */
  history: (RegionId | null)[];
  viewMode: ViewMode;
  layers: LayerValues;
  /** Neutral Motion Demo on/off. */
  motion: boolean;
  /** 카메라 이동 중 */
  isAnimating: boolean;
  /** 카메라 목표 재계산 트리거(선택 변경·초기화 모두 증가) */
  focusN: number;
  slot: string | null;
  /** 예약 이동(데모) 확인 상태: 이동할 진료과 코드 */
  handoff: RegionId | null;
  downgraded: QualityTier | null;
}

type Action =
  | { type: "ready" }
  | { type: "fail"; error: string }
  | { type: "select"; id: RegionId | null; record: boolean }
  | { type: "undo" }
  | { type: "view"; mode: Exclude<ViewMode, "custom"> }
  | { type: "layer"; layer: LayerId; value: number }
  | { type: "motion"; value?: boolean }
  | { type: "anim"; on: boolean }
  | { type: "reset" }
  | { type: "slot"; slot: string }
  | { type: "handoff" }
  | { type: "downgrade"; tier: QualityTier };

const initial: ExplorerState = {
  phase: "loading",
  error: null,
  selectedId: null,
  history: [],
  viewMode: "all",
  layers: { ...VIEW_PRESETS.all.values },
  motion: false,
  isAnimating: false,
  focusN: 0,
  slot: null,
  handoff: null,
  downgraded: null,
};

function reducer(s: ExplorerState, a: Action): ExplorerState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, isAnimating: false };
    case "select": {
      if (a.id === s.selectedId) return s;
      return {
        ...s,
        selectedId: a.id,
        history: a.record ? [...s.history, s.selectedId].slice(-20) : s.history,
        focusN: s.focusN + 1,
        slot: null,
        handoff: null,
      };
    }
    case "undo": {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return { ...s, selectedId: prev, history: s.history.slice(0, -1), focusN: s.focusN + 1, slot: null, handoff: null };
    }
    case "view":
      return { ...s, viewMode: a.mode, layers: { ...VIEW_PRESETS[a.mode].values } };
    case "layer":
      return { ...s, viewMode: "custom", layers: { ...s.layers, [a.layer]: a.value } };
    case "motion":
      return { ...s, motion: a.value ?? !s.motion };
    case "anim":
      return s.isAnimating === a.on ? s : { ...s, isAnimating: a.on };
    case "reset":
      return { ...initial, phase: s.phase, error: s.error, downgraded: s.downgraded, focusN: s.focusN + 1 };
    case "slot":
      return { ...s, slot: a.slot, handoff: null };
    case "handoff":
      return s.selectedId && s.slot ? { ...s, handoff: s.selectedId } : s;
    case "downgrade":
      return { ...s, downgraded: a.tier };
  }
}

const HASH_KEY = "#region=";
const regionFromHash = (hash: string): RegionId | null => {
  const id = hash.startsWith(HASH_KEY) ? hash.slice(HASH_KEY.length) : "";
  return (REGION_IDS as string[]).includes(id) ? (id as RegionId) : null;
};

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
const TIER_ORDER: QualityTier[] = ["low", "medium", "high"];
const lowerOf = (a: QualityTier, b: QualityTier) => (TIER_ORDER.indexOf(a) <= TIER_ORDER.indexOf(b) ? a : b);
function detectDeviceTier(): QualityTier {
  return window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier();
}

/** 측정 이벤트(PRD 7장). 개인정보는 포함하지 않는다. 구독자가 없어도 무해하다. */
export function track(name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", detail?: Record<string, string>) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, ...detail } }));
}

export function useExplorer() {
  const [state, dispatch] = useReducer(reducer, initial);
  const reduced = useSyncExternalStore(subscribeEnv, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeEnv, detectDeviceTier, () => "medium" as QualityTier);
  const tier: QualityTier = lowerOf(deviceTier, state.downgraded ?? "high");

  // 최초 진입 해시 복원 + 뒤로가기/앞으로가기 동기화(E2E-02). 해시는 진료 부위 ID 뿐이다.
  useEffect(() => {
    track("hero_view");
    const fromHash = regionFromHash(window.location.hash);
    if (fromHash) dispatch({ type: "select", id: fromHash, record: false });
    const onPop = () => dispatch({ type: "select", id: regionFromHash(window.location.hash), record: false });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const select = useCallback((id: RegionId | null) => {
    if (id) track("hero_select", { region: id });
    const next = id ? `${HASH_KEY}${id}` : window.location.pathname + window.location.search;
    if (regionFromHash(window.location.hash) !== id) window.history.pushState(null, "", next);
    dispatch({ type: "select", id, record: true });
  }, []);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      select,
      undo: () => {
        if (state.history.length === 0) return;
        const prev = state.history[state.history.length - 1];
        window.history.replaceState(null, "", prev ? `${HASH_KEY}${prev}` : window.location.pathname + window.location.search);
        dispatch({ type: "undo" });
      },
      setView: (mode: Exclude<ViewMode, "custom">) => {
        track("hero_interact", { control: `view-${mode}` });
        dispatch({ type: "view", mode });
      },
      setLayer: (layer: LayerId, value: number) => dispatch({ type: "layer", layer, value }),
      toggleMotion: (value?: boolean) => {
        track("hero_interact", { control: "motion" });
        dispatch({ type: "motion", value });
      },
      setAnimating: (on: boolean) => dispatch({ type: "anim", on }),
      reset: () => {
        if (regionFromHash(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
        dispatch({ type: "reset" });
      },
      setSlot: (slot: string) => dispatch({ type: "slot", slot }),
      /** 예약 페이지로 넘기는 데모 확인. 진료과 코드만 포함, 이동은 하지 않는다. */
      handoff: () => {
        track("hero_cta_click", { dept: state.selectedId ?? "none" });
        track("lead_submit", { dept: state.selectedId ?? "none" });
        dispatch({ type: "handoff" });
      },
      downgrade: (t: QualityTier) => dispatch({ type: "downgrade", tier: t }),
    }),
    [select, state.selectedId, state.history],
  );

  return { state, actions, reduced, tier };
}

export type ExplorerActions = ReturnType<typeof useExplorer>["actions"];

export const handoffUrl = (id: RegionId | null) => {
  const r = getRegion(id);
  return r ? `${BOOKING_PATH}?dept=${r.departmentCode}` : BOOKING_PATH;
};
