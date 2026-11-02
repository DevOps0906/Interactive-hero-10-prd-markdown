import { useCallback, useMemo, useReducer } from "react";

// 상태 머신: loading → intro → idle ⇄ interacting / transitioning, 어디서든 error.
// 모든 전이는 reducer 한 곳에서만 일어나 동시 상태 충돌을 막는다.
export type Phase = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "error";

export type InteractionState = {
  phase: Phase;
  selectedId: string | null;
  hoveredId: string | null;
  /** 선택 노드의 1-hop 이웃만 표시 */
  filter: boolean;
  introKey: number;
  /** 카메라 포커스 요청 번호 (선택·전체 보기 시 증가) */
  focusSeq: number;
  reheatKey: number;
  error: string | null;
};

type Action =
  | { type: "ready" }
  | { type: "introDone" }
  | { type: "hover"; id: string | null }
  | { type: "select"; id: string }
  | { type: "clear" }
  | { type: "toggleFilter" }
  | { type: "resetView" }
  | { type: "replayIntro" }
  | { type: "reheat" }
  | { type: "interactStart" }
  | { type: "interactEnd" }
  | { type: "transitionEnd" }
  | { type: "fail"; message: string };

const initial: InteractionState = {
  phase: "loading",
  selectedId: null,
  hoveredId: null,
  filter: false,
  introKey: 0,
  focusSeq: 0,
  reheatKey: 0,
  error: null,
};

const canAct = (p: Phase) => p === "idle" || p === "interacting" || p === "transitioning";

function reducer(s: InteractionState, a: Action): InteractionState {
  if (s.phase === "error") return s;
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "idle" } : s;
    case "hover":
      return s.phase === "loading" || s.hoveredId === a.id ? s : { ...s, hoveredId: a.id };
    case "select":
      if (!canAct(s.phase)) return s;
      return { ...s, selectedId: a.id, phase: "transitioning", focusSeq: s.focusSeq + 1 };
    case "clear":
      return s.selectedId === null && !s.filter ? s : { ...s, selectedId: null, filter: false };
    case "toggleFilter":
      return s.selectedId && canAct(s.phase) ? { ...s, filter: !s.filter } : s;
    case "resetView":
      if (!canAct(s.phase)) return s;
      return { ...s, selectedId: null, filter: false, phase: "transitioning", focusSeq: s.focusSeq + 1 };
    case "replayIntro":
      if (s.phase === "loading") return s;
      return { ...s, phase: "intro", selectedId: null, filter: false, introKey: s.introKey + 1 };
    case "reheat":
      return { ...s, reheatKey: s.reheatKey + 1 };
    case "interactStart":
      return s.phase === "idle" || s.phase === "transitioning" ? { ...s, phase: "interacting" } : s;
    case "interactEnd":
      return s.phase === "interacting" ? { ...s, phase: "idle" } : s;
    case "transitionEnd":
      return s.phase === "transitioning" ? { ...s, phase: "idle" } : s;
    case "fail":
      return { ...s, phase: "error", error: a.message };
  }
}

export function useHeroInteraction() {
  const [state, dispatch] = useReducer(reducer, initial);
  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      introDone: () => dispatch({ type: "introDone" }),
      hover: (id: string | null) => dispatch({ type: "hover", id }),
      select: (id: string) => dispatch({ type: "select", id }),
      clear: () => dispatch({ type: "clear" }),
      toggleFilter: () => dispatch({ type: "toggleFilter" }),
      resetView: () => dispatch({ type: "resetView" }),
      replayIntro: () => dispatch({ type: "replayIntro" }),
      reheat: () => dispatch({ type: "reheat" }),
      interactStart: () => dispatch({ type: "interactStart" }),
      interactEnd: () => dispatch({ type: "interactEnd" }),
      transitionEnd: () => dispatch({ type: "transitionEnd" }),
      fail: (message: string) => dispatch({ type: "fail", message }),
    }),
    [],
  );
  const toggleSelect = useCallback(
    (id: string) => (state.selectedId === id ? actions.clear() : actions.select(id)),
    [state.selectedId, actions],
  );
  return { state, actions, toggleSelect };
}

export type HeroActions = ReturnType<typeof useHeroInteraction>["actions"];
