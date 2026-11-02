"use client";

import { useEffect, useMemo, useReducer } from "react";
import type { Phase, ServiceData, ServiceId, Snapshot, ViewMode } from "./types";

export interface JourneyState {
  phase: Phase;
  selectedId: ServiceId;
  viewMode: ViewMode;
  stepIndex: number;
  docId: string | null;
  /** 서비스별 보유 서류 ID (참고용 표시, 어디에도 저장·전송하지 않음) */
  owned: Record<string, string[]>;
  isAnimating: boolean;
  history: Snapshot[];
}

type Action =
  | { type: "ready" }
  | { type: "introDone" }
  | { type: "fail" }
  | { type: "animDone" }
  | { type: "service"; id: ServiceId; push: boolean }
  | { type: "view"; mode: ViewMode }
  | { type: "step"; index: number }
  | { type: "doc"; id: string | null }
  | { type: "toggleOwned"; id: string }
  | { type: "undo" }
  | { type: "reset"; first: ServiceId };

function snap(s: JourneyState): Snapshot {
  return { selectedId: s.selectedId, stepIndex: s.stepIndex, viewMode: s.viewMode };
}
const pushHistory = (s: JourneyState) => [...s.history.slice(-19), snap(s)];

function reducer(s: JourneyState, a: Action): JourneyState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "ready", isAnimating: false } : s;
    case "fail":
      return { ...s, phase: "fallback", isAnimating: false };
    case "animDone":
      return s.isAnimating ? { ...s, isAnimating: false } : s;
    case "service":
      if (a.id === s.selectedId) return s;
      return { ...s, history: a.push ? pushHistory(s) : s.history, selectedId: a.id, stepIndex: 0, viewMode: "overview", docId: null, isAnimating: true };
    case "view":
      return a.mode === s.viewMode ? s : { ...s, viewMode: a.mode, docId: a.mode === "documents" ? s.docId : null, isAnimating: true };
    case "step":
      return { ...s, history: pushHistory(s), stepIndex: a.index, viewMode: "process", docId: null, isAnimating: true };
    case "doc":
      return { ...s, docId: a.id, viewMode: a.id ? "documents" : s.viewMode, isAnimating: true };
    case "toggleOwned": {
      const cur = s.owned[s.selectedId] ?? [];
      const next = cur.includes(a.id) ? cur.filter((x) => x !== a.id) : [...cur, a.id];
      return { ...s, owned: { ...s.owned, [s.selectedId]: next } };
    }
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...s, ...prev, docId: null, history: s.history.slice(0, -1), isAnimating: true };
    }
    case "reset":
      return { ...s, selectedId: a.first, stepIndex: 0, viewMode: "overview", docId: null, owned: {}, history: [], isAnimating: true };
  }
}

const HASH = "#service=";

export function useJourneyState(services: ServiceData[]) {
  const first = services[0].id;
  const [state, dispatch] = useReducer(reducer, {
    phase: "loading",
    selectedId: first,
    viewMode: "overview",
    stepIndex: 0,
    docId: null,
    owned: {},
    isAnimating: false,
    history: [],
  } satisfies JourneyState);

  // 뒤로가기/복귀: 해시 ↔ 선택 상태 동기화 (식별 가능한 값만, 개인정보 없음)
  useEffect(() => {
    const read = (push: boolean) => {
      const id = window.location.hash.startsWith(HASH) ? window.location.hash.slice(HASH.length) : null;
      const found = services.find((s) => s.id === id);
      if (found) dispatch({ type: "service", id: found.id, push });
      else if (id === null) dispatch({ type: "service", id: first, push }); // 해시 없는 URL → 기본 선택(리듀서가 동일 값이면 무시)
    };
    read(false);
    const onPop = () => read(false);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [services, first]);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      introDone: () => dispatch({ type: "introDone" }),
      fail: () => dispatch({ type: "fail" }),
      animDone: () => dispatch({ type: "animDone" }),
      selectService: (id: ServiceId) => {
        dispatch({ type: "service", id, push: true });
        if (window.location.hash !== `${HASH}${id}`) window.history.pushState(null, "", `${HASH}${id}`);
      },
      setView: (mode: ViewMode) => dispatch({ type: "view", mode }),
      selectStep: (index: number) => dispatch({ type: "step", index }),
      openDoc: (id: string | null) => dispatch({ type: "doc", id }),
      toggleOwned: (id: string) => dispatch({ type: "toggleOwned", id }),
      undo: () => dispatch({ type: "undo" }),
      reset: () => {
        dispatch({ type: "reset", first });
        if (window.location.hash.startsWith(HASH)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
      },
    }),
    [first],
  );

  return { state, actions };
}

export type JourneyActions = ReturnType<typeof useJourneyState>["actions"];
