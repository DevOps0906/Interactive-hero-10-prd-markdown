"use client";

import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { ANIM_DEADLINE_MS, TOUR_DWELL_MS, TOUR_SEQUENCE, track, type CampusData, type ProgramId, type SpaceId, type ViewMode } from "./config";

export type Phase = "loading" | "ready" | "fallback";

export interface TourState {
  phase: Phase;
  /** 현재 선택 공간(HTML 패널과 3D 하이라이트의 단일 출처). */
  selectedId: SpaceId | null;
  viewMode: ViewMode;
  isAnimating: boolean;
  /** 카메라 목표 번호. 증가할 때마다 카메라가 selectedId 쪽으로 이동한다. */
  shotKey: number;
  tourIndex: number;
  journeyIndex: number;
  compare: [ProgramId, ProgramId];
  scheduleOpen: boolean;
  history: (SpaceId | null)[];
  error: string;
}

type Keep = "tour" | "journey" | undefined;
type Action =
  | { type: "ready" }
  | { type: "fail"; message: string }
  | { type: "select"; id: SpaceId | null; keep?: Keep; journey?: number }
  | { type: "mode"; mode: ViewMode }
  | { type: "tourStart"; first: SpaceId }
  | { type: "tourAdvance"; next: SpaceId | null }
  | { type: "tourStop" }
  | { type: "compare"; slot: 0 | 1; id: ProgramId }
  | { type: "schedule" }
  | { type: "undo" }
  | { type: "reset"; programs: [ProgramId, ProgramId] }
  | { type: "arrive"; key: number };

const HISTORY_MAX = 20;

export function initialState(programs: [ProgramId, ProgramId]): TourState {
  return { phase: "loading", selectedId: null, viewMode: "orbit", isAnimating: false, shotKey: 0, tourIndex: -1, journeyIndex: -1, compare: programs, scheduleOpen: false, history: [], error: "" };
}

function moveTo(s: TourState, id: SpaceId | null, keep: Keep, journey = -1): TourState {
  const changed = id !== s.selectedId;
  return {
    ...s,
    selectedId: id,
    history: changed ? [...s.history, s.selectedId].slice(-HISTORY_MAX) : s.history,
    shotKey: s.shotKey + 1,
    isAnimating: true,
    scheduleOpen: false,
    tourIndex: keep === "tour" ? s.tourIndex : -1,
    journeyIndex: keep === "journey" ? journey : -1,
  };
}

function reducer(s: TourState, a: Action): TourState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.message, isAnimating: false, tourIndex: -1 };
    case "select":
      return moveTo(s, a.id, a.keep, a.journey);
    case "mode":
      return { ...s, viewMode: a.mode, tourIndex: -1 };
    case "tourStart":
      return moveTo({ ...s, tourIndex: 0 }, a.first, "tour");
    case "tourAdvance":
      if (s.tourIndex < 0) return s;
      if (a.next === null) return { ...s, tourIndex: -1 };
      return moveTo({ ...s, tourIndex: s.tourIndex + 1 }, a.next, "tour");
    case "tourStop":
      return { ...s, tourIndex: -1 };
    case "compare":
      return { ...s, compare: a.slot === 0 ? [a.id, s.compare[1]] : [s.compare[0], a.id] };
    case "schedule":
      return s.selectedId ? { ...s, scheduleOpen: !s.scheduleOpen } : s;
    case "undo": {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return { ...s, selectedId: prev, history: s.history.slice(0, -1), shotKey: s.shotKey + 1, isAnimating: true, scheduleOpen: false, tourIndex: -1, journeyIndex: -1 };
    }
    case "reset":
      return { ...initialState(a.programs), phase: s.phase, error: s.error, shotKey: s.shotKey + 1, isAnimating: true };
    case "arrive":
      return a.key === s.shotKey && s.isAnimating ? { ...s, isAnimating: false } : s;
  }
}

const RANK: Record<QualityTier, number> = { low: 0, medium: 1, high: 2 };
const subscribeNever = () => () => undefined;
function detectTier(): QualityTier {
  return window.matchMedia("(width < 768px)").matches ? "low" : detectQualityTier();
}

export function useCampusTour(data: CampusData) {
  const defaults = useMemo<[ProgramId, ProgramId]>(() => [data.programs[0].id, data.programs[1]?.id ?? data.programs[0].id], [data.programs]);
  const [state, dispatch] = useReducer(reducer, defaults, initialState);
  // 브라우저 전용 값은 외부 스토어로 읽는다(서버 스냅샷은 보수적 기본값).
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const detected = useSyncExternalStore(subscribeNever, detectTier, () => "medium" as QualityTier);
  const [forced, setForced] = useState<QualityTier | null>(null);
  const tier = forced && RANK[forced] < RANK[detected] ? forced : detected;

  useEffect(() => {
    track("hero_view");
  }, []);

  // 이동 중 상태는 벽시계 데드라인으로 반드시 끝낸다(탭 비활성·저프레임 대비).
  useEffect(() => {
    if (!state.isAnimating) return;
    const key = state.shotKey;
    const id = window.setTimeout(() => dispatch({ type: "arrive", key }), ANIM_DEADLINE_MS);
    return () => window.clearTimeout(id);
  }, [state.isAnimating, state.shotKey]);

  // 로딩 데드라인: WebGL 초기화가 멈춰도 CTA·패널은 항상 쓸 수 있다.
  useEffect(() => {
    if (state.phase !== "loading") return;
    const id = window.setTimeout(() => dispatch({ type: "fail", message: "3D 장면 준비가 지연되어 정지 이미지로 대체했습니다." }), 8000);
    return () => window.clearTimeout(id);
  }, [state.phase]);

  // 가이드 투어: 로비 → 강의실 → 실습실, 단계마다 벽시계 타이머로 진행.
  useEffect(() => {
    if (state.tourIndex < 0) return;
    const next = TOUR_SEQUENCE[state.tourIndex + 1] ?? null;
    const id = window.setTimeout(() => dispatch({ type: "tourAdvance", next }), TOUR_DWELL_MS);
    return () => window.clearTimeout(id);
  }, [state.tourIndex]);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      fail: (message: string) => dispatch({ type: "fail", message }),
      arrive: (key: number) => dispatch({ type: "arrive", key }),
      select: (id: SpaceId | null) => {
        track("hero_select", { id: id ?? "overview" });
        dispatch({ type: "select", id });
      },
      setMode: (mode: ViewMode) => {
        track("hero_interact", { action: "mode", mode });
        dispatch({ type: "mode", mode });
      },
      startTour: () => {
        track("hero_interact", { action: "tour_start" });
        dispatch({ type: "tourStart", first: TOUR_SEQUENCE[0] });
      },
      stopTour: () => dispatch({ type: "tourStop" }),
      journeyGo: (i: number) => {
        const step = data.journey[i];
        if (!step) return;
        track("hero_interact", { action: "journey", step: step.id });
        dispatch({ type: "select", id: step.spaceId, keep: "journey", journey: i });
      },
      setCompare: (slot: 0 | 1, id: ProgramId) => dispatch({ type: "compare", slot, id }),
      toggleSchedule: () => dispatch({ type: "schedule" }),
      undo: () => dispatch({ type: "undo" }),
      reset: () => {
        track("hero_interact", { action: "reset" });
        dispatch({ type: "reset", programs: defaults });
      },
    }),
    [data.journey, defaults],
  );

  const downgrade = useCallback((t: QualityTier) => setForced(t), []);
  return { state, actions, reduced, tier, downgrade };
}

export type TourActions = ReturnType<typeof useCampusTour>["actions"];
