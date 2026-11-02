"use client";

import { useMemo, useReducer } from "react";
import { useSyncExternalStore } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { DEFAULT_LOOK, itemById } from "./config";
import type { Look, ShotId, SizeId, SlotId } from "./types";

export type Phase = "loading" | "intro" | "idle" | "fallback";

export interface TurnCmd {
  kind: "nudge" | "face";
  /** nudge: 증분(rad), face: 목표 각도(rad) */
  value: number;
  n: number;
}

export interface LookbookState {
  phase: Phase;
  /** selectedId: 현재 편집 중인 슬롯 */
  selectedId: SlotId;
  /** config: 사용자가 바꾼 코디 */
  look: Look;
  history: Look[];
  /** viewMode: 카메라 프리셋 */
  viewMode: ShotId;
  turntable: boolean;
  clothMotion: boolean;
  size: SizeId;
  /** isAnimating: 의상 교체·카메라 이동 중 */
  isAnimating: boolean;
  animToken: number;
  turnCmd: TurnCmd;
  resetN: number;
  downgraded: QualityTier | null;
  error: string | null;
}

type Action =
  | { type: "ready" }
  | { type: "introDone" }
  | { type: "fail"; error: string }
  | { type: "slot"; slot: SlotId }
  | { type: "item"; slot: SlotId; id: string | null }
  | { type: "swatch"; slot: SlotId; id: string }
  | { type: "undo" }
  | { type: "resetLook" }
  | { type: "shot"; shot: ShotId }
  | { type: "turntable"; on: boolean }
  | { type: "cloth"; on: boolean }
  | { type: "turn"; kind: "nudge" | "face"; value: number }
  | { type: "size"; size: SizeId }
  | { type: "animDone"; token: number }
  | { type: "downgrade"; tier: QualityTier };

const MAX_HISTORY = 20;

function withLook(s: LookbookState, next: Look, slot: SlotId): LookbookState {
  if (JSON.stringify(next) === JSON.stringify(s.look)) return s;
  return { ...s, look: next, selectedId: slot, history: [...s.history, s.look].slice(-MAX_HISTORY), isAnimating: true, animToken: s.animToken + 1 };
}

function reducer(s: LookbookState, a: Action): LookbookState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "idle" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, isAnimating: false };
    case "slot":
      return { ...s, selectedId: a.slot };
    case "item": {
      if (a.id === null) return withLook(s, { ...s.look, [a.slot]: null }, a.slot);
      const first = itemById(a.id).swatches[0].id;
      const keep = s.look[a.slot] === a.id;
      return withLook(s, { ...s.look, [a.slot]: a.id, swatch: { ...s.look.swatch, [a.slot]: keep ? s.look.swatch[a.slot] : first } }, a.slot);
    }
    case "swatch":
      return withLook(s, { ...s.look, swatch: { ...s.look.swatch, [a.slot]: a.id } }, a.slot);
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev) return s;
      return { ...s, look: prev, history: s.history.slice(0, -1), isAnimating: true, animToken: s.animToken + 1 };
    }
    case "resetLook":
      return {
        ...s,
        look: DEFAULT_LOOK,
        history: [],
        selectedId: "top",
        viewMode: "full",
        turntable: true,
        resetN: s.resetN + 1,
        turnCmd: { kind: "face", value: 0, n: s.turnCmd.n + 1 },
        isAnimating: true,
        animToken: s.animToken + 1,
      };
    case "shot":
      return s.viewMode === a.shot ? s : { ...s, viewMode: a.shot, isAnimating: true, animToken: s.animToken + 1 };
    case "turntable":
      return { ...s, turntable: a.on };
    case "cloth":
      return { ...s, clothMotion: a.on };
    case "turn":
      return { ...s, turntable: false, turnCmd: { kind: a.kind, value: a.value, n: s.turnCmd.n + 1 } };
    case "size":
      return { ...s, size: a.size };
    case "animDone":
      return a.token === s.animToken && s.isAnimating ? { ...s, isAnimating: false } : s;
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
/** 모바일(~767)은 항상 low. */
const detectDeviceTier = (): QualityTier => (window.matchMedia(MOBILE_MQ).matches ? "low" : detectQualityTier());

export function useLookbook() {
  const [state, dispatch] = useReducer(reducer, {
    phase: "loading",
    selectedId: "top",
    look: DEFAULT_LOOK,
    history: [],
    viewMode: "full",
    turntable: true,
    clothMotion: true,
    size: "M",
    isAnimating: false,
    animToken: 0,
    turnCmd: { kind: "face", value: 0, n: 0 },
    resetN: 0,
    downgraded: null,
    error: null,
  } satisfies LookbookState);

  const reduced = useSyncExternalStore(subscribeEnv, prefersReducedMotion, () => false);
  const deviceTier = useSyncExternalStore(subscribeEnv, detectDeviceTier, () => "medium" as QualityTier);
  const tier: QualityTier = lowerOf(deviceTier, state.downgraded ?? "high");

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      introDone: () => dispatch({ type: "introDone" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      selectSlot: (slot: SlotId) => dispatch({ type: "slot", slot }),
      setItem: (slot: SlotId, id: string | null) => dispatch({ type: "item", slot, id }),
      setSwatch: (slot: SlotId, id: string) => dispatch({ type: "swatch", slot, id }),
      undo: () => dispatch({ type: "undo" }),
      resetLook: () => dispatch({ type: "resetLook" }),
      setShot: (shot: ShotId) => dispatch({ type: "shot", shot }),
      setTurntable: (on: boolean) => dispatch({ type: "turntable", on }),
      setCloth: (on: boolean) => dispatch({ type: "cloth", on }),
      turn: (kind: "nudge" | "face", value: number) => dispatch({ type: "turn", kind, value }),
      setSize: (size: SizeId) => dispatch({ type: "size", size }),
      animDone: (token: number) => dispatch({ type: "animDone", token }),
      downgrade: (tier: QualityTier) => dispatch({ type: "downgrade", tier }),
    }),
    [],
  );

  return { state, actions, reduced, tier };
}

export type LookbookActions = ReturnType<typeof useLookbook>["actions"];
