"use client";

import { useCallback, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { DAYLIGHT_BY_ID, DEFAULT_CONFIG, FURNITURE_BY_ID, MOVE_STEP, SURFACE_LABEL, VIEWPOINTS } from "./config";
import { clampToRoom, materialOf, track } from "./logic";
import type { DaylightId, FurnitureId, SceneConfig, SelectedId, SurfaceId, ViewMode } from "./types";

export type Phase = "loading" | "ready" | "fallback";

export interface State {
  phase: Phase;
  config: SceneConfig;
  selectedId: SelectedId;
  viewMode: ViewMode;
  viewIndex: number;
  /** 카메라 이동 중 */
  isAnimating: boolean;
  showDims: boolean;
  history: SceneConfig[];
  /** 걷기 시점 좌우 둘러보기 */
  look: { dir: number; n: number };
  /** 화면 읽기용 상태 문구(aria-live) */
  status: string;
  error: string | null;
}

type Action =
  | { type: "ready" }
  | { type: "fail"; error: string }
  | { type: "material"; surface: SurfaceId; id: string }
  | { type: "daylight"; id: DaylightId }
  | { type: "toggleItem"; id: FurnitureId }
  | { type: "select"; id: SelectedId }
  | { type: "move"; id: FurnitureId; x: number; z: number }
  | { type: "nudge"; id: FurnitureId; dx: number; dz: number }
  | { type: "rotate"; id: FurnitureId }
  | { type: "view"; mode: ViewMode; index?: number }
  | { type: "lookAround"; dir: number }
  | { type: "animDone" }
  | { type: "dims" }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "load"; config: SceneConfig };

const HISTORY_MAX = 50;
const push = (s: State): SceneConfig[] => [...s.history.slice(-(HISTORY_MAX - 1)), s.config];
const withConfig = (s: State, config: SceneConfig, status: string): State => ({ ...s, config, history: push(s), status });
const nameOf = (id: SelectedId) => (id === null ? "" : id in FURNITURE_BY_ID ? FURNITURE_BY_ID[id as FurnitureId].name : SURFACE_LABEL[id as SurfaceId]);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "ready", status: "3D 공간을 불러왔습니다." } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, status: "3D를 표시할 수 없어 정지 이미지로 대체했습니다. 아래 패널은 그대로 사용할 수 있습니다." };
    case "material": {
      if (s.config[a.surface] === a.id) return { ...s, selectedId: a.surface };
      const m = materialOf(a.surface, a.id);
      return { ...withConfig(s, { ...s.config, [a.surface]: a.id }, `${SURFACE_LABEL[a.surface]} 재질: ${m.label} 선택됨`), selectedId: a.surface };
    }
    case "daylight":
      if (s.config.daylight === a.id) return s;
      return withConfig(s, { ...s.config, daylight: a.id }, `채광: ${DAYLIGHT_BY_ID[a.id].label} 선택됨`);
    case "toggleItem": {
      const it = s.config.items[a.id];
      const name = FURNITURE_BY_ID[a.id].name;
      if (it.placed) {
        const next = withConfig(s, { ...s.config, items: { ...s.config.items, [a.id]: { ...it, placed: false } } }, `${name} 제거됨`);
        return { ...next, selectedId: s.selectedId === a.id ? null : s.selectedId };
      }
      const init = FURNITURE_BY_ID[a.id].initial;
      const placed = { ...clampToRoom(a.id, { ...init, placed: true }, init.x, init.z), placed: true };
      return { ...withConfig(s, { ...s.config, items: { ...s.config.items, [a.id]: placed } }, `${name} 배치됨`), selectedId: a.id };
    }
    case "select":
      if (a.id !== null && a.id in FURNITURE_BY_ID && !s.config.items[a.id as FurnitureId].placed) return s;
      return { ...s, selectedId: a.id, status: a.id === null ? "선택 해제됨" : `${nameOf(a.id)} 선택됨` };
    case "move": {
      const it = s.config.items[a.id];
      if (!it.placed) return s;
      const next = clampToRoom(a.id, it, a.x, a.z);
      if (next.x === it.x && next.z === it.z) return s;
      return withConfig(s, { ...s.config, items: { ...s.config.items, [a.id]: next } }, `${FURNITURE_BY_ID[a.id].name} 위치 x ${next.x.toFixed(1)} m, z ${next.z.toFixed(1)} m`);
    }
    case "nudge": {
      const it = s.config.items[a.id];
      if (!it.placed) return s;
      return reducer(s, { type: "move", id: a.id, x: it.x + a.dx * MOVE_STEP, z: it.z + a.dz * MOVE_STEP });
    }
    case "rotate": {
      const it = s.config.items[a.id];
      if (!it.placed) return s;
      const rot: 0 | 1 = it.rot === 0 ? 1 : 0;
      const next = clampToRoom(a.id, { ...it, rot }, it.x, it.z);
      return withConfig(s, { ...s.config, items: { ...s.config.items, [a.id]: next } }, `${FURNITURE_BY_ID[a.id].name} ${rot === 1 ? "90도 회전됨" : "기본 방향"}`);
    }
    case "view": {
      const index = a.index ?? s.viewIndex;
      if (a.mode === s.viewMode && index === s.viewIndex) return s;
      const label = a.mode === "orbit" ? "방 전체 둘러보기" : `걷기 시점: ${VIEWPOINTS[index].label}`;
      return { ...s, viewMode: a.mode, viewIndex: index, isAnimating: true, status: `시점: ${label}` };
    }
    case "lookAround":
      return s.viewMode === "walk" ? { ...s, look: { dir: a.dir, n: s.look.n + 1 }, status: a.dir < 0 ? "왼쪽으로 둘러봄" : "오른쪽으로 둘러봄" } : s;
    case "animDone":
      return s.isAnimating ? { ...s, isAnimating: false } : s;
    case "dims":
      return { ...s, showDims: !s.showDims, status: s.showDims ? "치수 표시 꺼짐" : "치수 표시 켜짐 (참고용)" };
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...s, config: prev, history: s.history.slice(0, -1), status: "되돌렸습니다." };
    }
    case "reset":
      return { ...withConfig(s, DEFAULT_CONFIG, "기본 구성으로 초기화했습니다."), selectedId: null, viewMode: "orbit", viewIndex: 0, isAnimating: s.viewMode !== "orbit" };
    case "load":
      return { ...withConfig(s, a.config, "저장한 구성을 불러왔습니다."), selectedId: null };
  }
}

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
function detectDeviceTier(): QualityTier {
  return window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier();
}

export function useConfigurator() {
  const [state, dispatch] = useReducer(reducer, {
    phase: "loading",
    config: DEFAULT_CONFIG,
    selectedId: null,
    viewMode: "orbit",
    viewIndex: 0,
    isAnimating: false,
    showDims: false,
    history: [],
    look: { dir: 0, n: 0 },
    status: "",
    error: null,
  } satisfies State);

  const reduced = useSyncExternalStore(subscribeEnv, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeEnv, detectDeviceTier, () => "medium" as QualityTier);
  const [slow, setSlow] = useState(false);
  const tier: QualityTier = slow ? "low" : deviceTier;

  const interacted = useRef(false);
  const touch = useCallback(() => {
    if (!interacted.current) {
      interacted.current = true;
      track("hero_interact");
    }
  }, []);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      setMaterial: (surface: SurfaceId, id: string) => {
        touch();
        track("hero_select", { kind: "material", surface, id });
        dispatch({ type: "material", surface, id });
      },
      setDaylight: (id: DaylightId) => {
        touch();
        track("hero_select", { kind: "daylight", id });
        dispatch({ type: "daylight", id });
      },
      toggleItem: (id: FurnitureId) => {
        touch();
        track("hero_select", { kind: "item", id });
        dispatch({ type: "toggleItem", id });
      },
      select: (id: SelectedId) => {
        touch();
        if (id) track("hero_select", { kind: "select", id });
        dispatch({ type: "select", id });
      },
      move: (id: FurnitureId, x: number, z: number) => {
        touch();
        dispatch({ type: "move", id, x, z });
      },
      nudge: (id: FurnitureId, dx: number, dz: number) => {
        touch();
        dispatch({ type: "nudge", id, dx, dz });
      },
      rotate: (id: FurnitureId) => {
        touch();
        dispatch({ type: "rotate", id });
      },
      setView: (mode: ViewMode, index?: number) => {
        touch();
        dispatch({ type: "view", mode, index });
      },
      lookAround: (dir: number) => dispatch({ type: "lookAround", dir }),
      animDone: () => dispatch({ type: "animDone" }),
      toggleDims: () => {
        touch();
        dispatch({ type: "dims" });
      },
      undo: () => dispatch({ type: "undo" }),
      reset: () => {
        touch();
        dispatch({ type: "reset" });
      },
      load: (config: SceneConfig) => dispatch({ type: "load", config }),
      downgrade: () => setSlow(true),
    }),
    [touch],
  );

  return { state, actions, reduced, tier };
}

export type Actions = ReturnType<typeof useConfigurator>["actions"];
