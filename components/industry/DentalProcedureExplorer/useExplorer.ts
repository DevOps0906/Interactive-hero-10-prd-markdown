"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion } from "@/lib/hero/performance";
import {
  MOBILE_MQ,
  PROCEDURE_BY_ID,
  type BeforeAfter,
  type LayerId,
  type ProcedureId,
  type QualityTier,
  type ViewMode,
} from "./config";

export type Phase = "loading" | "ready" | "fallback";

/** 단일 상태 원천: HTML 패널과 3D 장면이 모두 이 값에서 렌더링된다. */
export interface ExplorerState {
  phase: Phase;
  selectedId: string | null;
  /** 이전 선택 스택(되돌리기) */
  history: (string | null)[];
  viewMode: ViewMode;
  layerId: LayerId | null;
  procedureId: ProcedureId;
  stepIndex: number;
  beforeAfter: BeforeAfter;
  isAnimating: boolean;
  nudge: { dir: number; n: number };
  resetN: number;
  downgraded: QualityTier | null;
  error: string | null;
}

type Action =
  | { type: "ready" }
  | { type: "fail"; error: string }
  | { type: "select"; id: string | null }
  | { type: "undo" }
  | { type: "view"; mode: ViewMode }
  | { type: "layer"; id: LayerId | null }
  | { type: "procedure"; id: ProcedureId }
  | { type: "step"; index: number }
  | { type: "beforeAfter"; value: BeforeAfter }
  | { type: "animDone" }
  | { type: "nudge"; dir: number }
  | { type: "reset" }
  | { type: "downgrade"; tier: QualityTier };

const INITIAL: ExplorerState = {
  phase: "loading",
  selectedId: null,
  history: [],
  viewMode: "arch",
  layerId: null,
  procedureId: "checkup",
  stepIndex: 0,
  beforeAfter: "off",
  isAnimating: false,
  nudge: { dir: 0, n: 0 },
  resetN: 0,
  downgraded: null,
  error: null,
};

const TIER_RANK: Record<QualityTier, number> = { low: 0, medium: 1, high: 2 };
const MAX_HISTORY = 20;

function reducer(s: ExplorerState, a: Action): ExplorerState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, isAnimating: false };
    case "select":
      if (a.id === s.selectedId) return s;
      // 단면도에서 치아를 바꾸면 레이어 선택은 초기화
      return { ...s, selectedId: a.id, history: [...s.history, s.selectedId].slice(-MAX_HISTORY), layerId: null, beforeAfter: "off", isAnimating: true };
    case "undo": {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return { ...s, selectedId: prev, history: s.history.slice(0, -1), layerId: null, beforeAfter: "off", isAnimating: true };
    }
    case "view":
      return s.viewMode === a.mode ? s : { ...s, viewMode: a.mode, layerId: null, isAnimating: true };
    case "layer":
      return { ...s, layerId: a.id };
    case "procedure":
      return s.procedureId === a.id ? s : { ...s, procedureId: a.id, stepIndex: 0, isAnimating: true };
    case "step": {
      const max = PROCEDURE_BY_ID[s.procedureId].steps.length - 1;
      const next = Math.min(Math.max(a.index, 0), max);
      return next === s.stepIndex ? s : { ...s, stepIndex: next, isAnimating: true };
    }
    case "beforeAfter":
      return { ...s, beforeAfter: a.value };
    case "animDone":
      return s.isAnimating ? { ...s, isAnimating: false } : s;
    case "nudge":
      return { ...s, nudge: { dir: a.dir, n: s.nudge.n + 1 } };
    case "reset":
      return { ...INITIAL, phase: s.phase, downgraded: s.downgraded, error: s.error, procedureId: s.procedureId, resetN: s.resetN + 1, isAnimating: true };
    case "downgrade":
      return !s.downgraded || TIER_RANK[a.tier] < TIER_RANK[s.downgraded] ? { ...s, downgraded: a.tier } : s;
    default:
      return s;
  }
}

/** 측정 이벤트: 개인정보 없이 window 이벤트로만 내보낸다(분석 도구 연결은 소비 측 책임). */
export function track(name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", payload: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero-analytics", { detail: { name, hero: "clinic-dental-3d", ...payload } }));
}

const subscribeReduced = (cb: () => void) => subscribeReducedMotion(() => cb());
const subscribeNone = () => () => {};
const detectDeviceTier = (): QualityTier => (window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier());

export function useExplorer() {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const reduced = useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeNone, detectDeviceTier, () => "medium" as QualityTier);
  const tier: QualityTier = state.downgraded && TIER_RANK[state.downgraded] < TIER_RANK[deviceTier] ? state.downgraded : deviceTier;
  const interacted = useRef(false);
  const fpsRef = useRef(0);

  useEffect(() => {
    track("hero_view");
  }, []);

  // 애니메이션 완료 콜백이 오지 않아도(백그라운드 탭 등) 벽시계 기준으로 해제한다
  useEffect(() => {
    if (!state.isAnimating) return;
    const id = window.setTimeout(() => dispatch({ type: "animDone" }), 1600);
    return () => window.clearTimeout(id);
  }, [state.isAnimating, state.selectedId, state.viewMode, state.stepIndex, state.procedureId, state.resetN]);

  // 3D 초기화가 끝나지 않아도 6초 뒤에는 HTML 조작이 가능하도록 ready 처리(로딩 오버레이 해제)
  useEffect(() => {
    if (state.phase !== "loading") return;
    const id = window.setTimeout(() => dispatch({ type: "ready" }), 6000);
    return () => window.clearTimeout(id);
  }, [state.phase]);

  const markInteract = useCallback((kind: string) => {
    if (!interacted.current) {
      interacted.current = true;
      track("hero_interact", { kind });
    }
  }, []);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      select: (id: string | null) => {
        markInteract("select");
        if (id) track("hero_select", { toothId: id });
        dispatch({ type: "select", id });
      },
      undo: () => dispatch({ type: "undo" }),
      setView: (mode: ViewMode) => {
        markInteract("view");
        dispatch({ type: "view", mode });
      },
      setLayer: (id: LayerId | null) => dispatch({ type: "layer", id }),
      setProcedure: (id: ProcedureId) => {
        markInteract("procedure");
        dispatch({ type: "procedure", id });
      },
      setStep: (index: number) => {
        markInteract("step");
        dispatch({ type: "step", index });
      },
      setBeforeAfter: (value: BeforeAfter) => dispatch({ type: "beforeAfter", value }),
      animDone: () => dispatch({ type: "animDone" }),
      nudge: (dir: number) => {
        markInteract("rotate");
        dispatch({ type: "nudge", dir });
      },
      reset: () => dispatch({ type: "reset" }),
      downgrade: (t: QualityTier) => dispatch({ type: "downgrade", tier: t }),
    }),
    [markInteract],
  );

  return { state, actions, reduced, tier, fpsRef };
}

export type ExplorerActions = ReturnType<typeof useExplorer>["actions"];
