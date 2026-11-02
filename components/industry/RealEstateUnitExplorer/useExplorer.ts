"use client";

import { useEffect, useMemo, useReducer, useRef, useSyncExternalStore, type MutableRefObject } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import type { UnitRecord, UnitStatus, ViewMode } from "./types";

export type Phase = "loading" | "ready" | "fallback";

export interface ExplorerState {
  phase: Phase;
  error: string | null;
  selectedId: string | null;
  floor: number | null;
  cutaway: boolean;
  viewMode: ViewMode;
  viewN: number; // 같은 시점 재실행용 카운터
  isAnimating: boolean;
  compareIds: string[];
  layers: Record<UnitStatus, boolean>;
  overrides: Record<string, UnitStatus>;
  history: { id: string; floor: number }[];
  tier: QualityTier;
  notice: string;
}

const ALL_LAYERS: Record<UnitStatus, boolean> = { available: true, reserved: true, sold: true };

const initial: ExplorerState = {
  phase: "loading",
  error: null,
  selectedId: null,
  floor: null,
  cutaway: false,
  viewMode: "exterior",
  viewN: 0,
  isAnimating: false,
  compareIds: [],
  layers: ALL_LAYERS,
  overrides: {},
  history: [],
  tier: "medium",
  notice: "",
};

type Action =
  | { type: "select"; id: string | null; floor?: number }
  | { type: "floor"; floor: number | null }
  | { type: "cutaway" }
  | { type: "view"; mode: ViewMode }
  | { type: "animating"; on: boolean }
  | { type: "compare"; id: string }
  | { type: "status"; id: string; status: UnitStatus }
  | { type: "layer"; status: UnitStatus }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "ready" }
  | { type: "fail"; error: string }
  | { type: "tier"; tier: QualityTier };

function reducer(s: ExplorerState, a: Action): ExplorerState {
  switch (a.type) {
    case "select": {
      if (a.id === null) return { ...s, selectedId: null, viewMode: s.viewMode === "window" ? "exterior" : s.viewMode, viewN: s.viewN + 1, notice: "선택을 해제했습니다." };
      if (a.id === s.selectedId) return s;
      const history = s.selectedId && s.floor !== null ? [...s.history, { id: s.selectedId, floor: s.floor }].slice(-20) : s.history;
      return { ...s, selectedId: a.id, floor: a.floor ?? s.floor, history, notice: "" };
    }
    case "floor":
      return { ...s, floor: a.floor, cutaway: a.floor === null ? false : s.cutaway, notice: "" };
    case "cutaway":
      if (s.floor === null) return { ...s, notice: "단면 보기는 층을 먼저 선택해야 합니다." };
      return { ...s, cutaway: !s.cutaway, notice: "" };
    case "view":
      if (a.mode === "window" && !s.selectedId) return { ...s, notice: "창 방향 조망은 호실을 먼저 선택해야 합니다." };
      return { ...s, viewMode: a.mode, viewN: s.viewN + 1, cutaway: a.mode === "floorplan" && s.floor !== null ? true : s.cutaway, notice: "" };
    case "animating":
      return s.isAnimating === a.on ? s : { ...s, isAnimating: a.on };
    case "compare": {
      if (s.compareIds.includes(a.id)) return { ...s, compareIds: s.compareIds.filter((x) => x !== a.id), notice: "비교 목록에서 뺐습니다." };
      if (s.compareIds.length >= 2) return { ...s, notice: "비교는 최대 2개 호실까지입니다. 하나를 먼저 빼 주세요." };
      return { ...s, compareIds: [...s.compareIds, a.id], notice: "비교 목록에 담았습니다." };
    }
    case "status":
      return { ...s, overrides: { ...s.overrides, [a.id]: a.status }, notice: "" };
    case "layer":
      return { ...s, layers: { ...s.layers, [a.status]: !s.layers[a.status] }, notice: "" };
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...s, selectedId: prev.id, floor: prev.floor, history: s.history.slice(0, -1), notice: "이전 선택으로 되돌렸습니다." };
    }
    case "reset":
      return { ...initial, phase: s.phase, error: s.error, tier: s.tier, viewN: s.viewN + 1, notice: "선택과 보기 설정을 초기화했습니다." };
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error };
    case "tier":
      return s.tier === a.tier ? s : { ...s, tier: a.tier };
  }
}

export interface ExplorerActions {
  select(id: string | null): void;
  setFloor(floor: number | null): void;
  toggleCutaway(): void;
  setView(mode: ViewMode): void;
  setAnimating(on: boolean): void;
  toggleCompare(id: string): void;
  setStatus(id: string, status: UnitStatus): void;
  toggleLayer(status: UnitStatus): void;
  undo(): void;
  reset(): void;
  ready(): void;
  fail(error: string): void;
  downgrade(tier: QualityTier): void;
}

/** 측정 이벤트(개인정보 제외). 분석 SDK 는 window 의 hero:analytics 이벤트를 구독해 연결한다. */
export function track(name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", detail: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero:analytics", { detail: { name, hero: "realestate-unit-explorer", ...detail } }));
}

function hashUnitId(): string | null {
  const m = /^#unit=([\w-]+)$/.exec(window.location.hash);
  return m ? m[1] : null;
}

export function useExplorer(units: UnitRecord[]): {
  state: ExplorerState;
  actions: ExplorerActions;
  viewUnits: UnitRecord[];
  byId: Map<string, UnitRecord>;
  reduced: boolean;
  fpsRef: MutableRefObject<number>;
} {
  const [state, dispatch] = useReducer(reducer, initial);
  const reduced = useSyncExternalStore((cb) => subscribeReducedMotion(cb), prefersReducedMotion, () => false);
  const fpsRef = useRef(60);
  const interacted = useRef(false);

  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const viewUnits = useMemo(() => units.map((u) => (state.overrides[u.id] ? { ...u, status: state.overrides[u.id] } : u)), [units, state.overrides]);

  const actions = useMemo<ExplorerActions>(() => {
    const touch = () => {
      if (!interacted.current) {
        interacted.current = true;
        track("hero_interact");
      }
    };
    return {
      select(id) {
        touch();
        if (id === null) return dispatch({ type: "select", id: null });
        const u = byId.get(id);
        if (!u) return;
        track("hero_select", { unit: id, floor: u.floor, status: u.status });
        dispatch({ type: "select", id, floor: u.floor });
      },
      setFloor: (floor) => (touch(), dispatch({ type: "floor", floor })),
      toggleCutaway: () => (touch(), dispatch({ type: "cutaway" })),
      setView: (mode) => (touch(), dispatch({ type: "view", mode })),
      setAnimating: (on) => dispatch({ type: "animating", on }),
      toggleCompare: (id) => (touch(), dispatch({ type: "compare", id })),
      setStatus: (id, status) => (touch(), dispatch({ type: "status", id, status })),
      toggleLayer: (status) => (touch(), dispatch({ type: "layer", status })),
      undo: () => (touch(), dispatch({ type: "undo" })),
      reset: () => (touch(), dispatch({ type: "reset" })),
      ready: () => dispatch({ type: "ready" }),
      fail: (error) => dispatch({ type: "fail", error }),
      downgrade: (tier) => dispatch({ type: "tier", tier }),
    };
  }, [byId]);

  // 마운트: 이벤트·품질 등급·모션 설정·WebGL 지원 확인
  useEffect(() => {
    track("hero_view");
    dispatch({ type: "tier", tier: window.innerWidth < 768 ? "low" : detectQualityTier() });
    try {
      const c = document.createElement("canvas");
      if (!(c.getContext("webgl2") || c.getContext("webgl"))) dispatch({ type: "fail", error: "이 브라우저는 WebGL 을 지원하지 않습니다." });
    } catch {
      dispatch({ type: "fail", error: "WebGL 초기화에 실패했습니다." });
    }
  }, []);

  // 딥링크: #unit=<id> 를 읽고(복귀·뒤로가기 포함) 선택 변경을 주소에 반영
  useEffect(() => {
    const apply = () => {
      const id = hashUnitId();
      if (id && byId.has(id)) actions.select(id);
    };
    apply();
    window.addEventListener("hashchange", apply);
    window.addEventListener("pageshow", apply);
    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("pageshow", apply);
    };
  }, [byId, actions]);

  const skipSync = useRef(true);
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const base = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, "", state.selectedId ? `${base}#unit=${state.selectedId}` : base);
  }, [state.selectedId]);

  return { state, actions, viewUnits, byId, reduced, fpsRef };
}
