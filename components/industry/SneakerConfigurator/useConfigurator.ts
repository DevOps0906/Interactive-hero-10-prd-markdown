"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { track } from "./analytics";
import { DEFAULT_CONFIG, MATERIALS, colorOf, demoCartAdapter, resolveVariant, type CartAdapter } from "./config";
import type { CartLine, MaterialId, Notice, PartId, Phase, SneakerConfig, ViewId } from "./types";

export interface State {
  phase: Phase;
  error: string | null;
  retryN: number;
  /** 현재 선택된 부위(3D 하이라이트와 색상 대상) */
  selectedId: PartId;
  config: SneakerConfig;
  past: SneakerConfig[];
  future: SneakerConfig[];
  viewMode: ViewId;
  exploded: boolean;
  isAnimating: boolean;
  spinN: number;
  staticMode: boolean;
  tierCap: QualityTier | null;
  cart: CartLine[];
  pending: boolean;
  checkedOut: boolean;
  notice: Notice | null;
}

type Action =
  | { type: "ready" }
  | { type: "introDone" }
  | { type: "fail"; error: string }
  | { type: "retry" }
  | { type: "select"; id: PartId }
  | { type: "config"; next: SneakerConfig }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset" }
  | { type: "view"; id: ViewId }
  | { type: "explode"; value?: boolean }
  | { type: "animating"; value: boolean }
  | { type: "spin" }
  | { type: "static"; value: boolean }
  | { type: "downgrade"; tier: QualityTier }
  | { type: "pending"; value: boolean }
  | { type: "cartSet"; cart: CartLine[]; notice: Notice }
  | { type: "notice"; kind: Notice["kind"]; text: string }
  | { type: "checkout" };

const initial: State = {
  phase: "loading",
  error: null,
  retryN: 0,
  selectedId: "upper",
  config: DEFAULT_CONFIG,
  past: [],
  future: [],
  viewMode: "free",
  exploded: false,
  isAnimating: false,
  spinN: 0,
  staticMode: false,
  tierCap: null,
  cart: [],
  pending: false,
  checkedOut: false,
  notice: null,
};

const HISTORY_MAX = 30;
const note = (s: State, kind: Notice["kind"], text: string): Notice => ({ kind, text, n: (s.notice?.n ?? 0) + 1 });
const sameConfig = (a: SneakerConfig, b: SneakerConfig) =>
  a.material === b.material && a.size === b.size && (Object.keys(a.colors) as PartId[]).every((p) => a.colors[p] === b.colors[p]);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "idle" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, isAnimating: false };
    case "retry":
      return { ...s, phase: "loading", error: null, retryN: s.retryN + 1, staticMode: false, isAnimating: false };
    case "select":
      return { ...s, selectedId: a.id };
    case "config":
      if (sameConfig(s.config, a.next)) return s;
      return { ...s, config: a.next, past: [...s.past, s.config].slice(-HISTORY_MAX), future: [], checkedOut: false };
    case "undo": {
      const prev = s.past[s.past.length - 1];
      return prev ? { ...s, config: prev, past: s.past.slice(0, -1), future: [s.config, ...s.future] } : s;
    }
    case "redo": {
      const next = s.future[0];
      return next ? { ...s, config: next, past: [...s.past, s.config], future: s.future.slice(1) } : s;
    }
    case "reset":
      if (sameConfig(s.config, DEFAULT_CONFIG) && s.viewMode === "free" && !s.exploded) return s;
      return {
        ...s,
        config: DEFAULT_CONFIG,
        past: sameConfig(s.config, DEFAULT_CONFIG) ? s.past : [...s.past, s.config].slice(-HISTORY_MAX),
        future: [],
        viewMode: "free",
        exploded: false,
        selectedId: "upper",
      };
    case "view":
      return { ...s, viewMode: a.id };
    case "explode":
      return { ...s, exploded: a.value ?? !s.exploded };
    case "animating":
      return s.isAnimating === a.value ? s : { ...s, isAnimating: a.value };
    case "spin":
      return { ...s, spinN: s.spinN + 1, viewMode: "free" };
    case "static":
      return { ...s, staticMode: a.value };
    case "downgrade":
      return { ...s, tierCap: a.tier };
    case "pending":
      return { ...s, pending: a.value };
    case "cartSet":
      return { ...s, cart: a.cart, notice: a.notice, checkedOut: false };
    case "notice":
      return { ...s, notice: note(s, a.kind, a.text) };
    case "checkout":
      return s.cart.length
        ? { ...s, checkedOut: true, notice: note(s, "success", "데모 주문이 접수된 것으로 표시합니다. 실제 결제·전송은 일어나지 않았습니다.") }
        : s;
  }
}

/** 상태 한 곳 + 액션. cart 는 어댑터로 주입(기본 DEMO, 메모리 전용·저장 없음). */
export function useConfigurator(cartAdapter: CartAdapter = demoCartAdapter) {
  const [state, dispatch] = useReducer(reducer, initial);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const pendingRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const actions = useMemo(
    () => ({
      ready: () => dispatch({ type: "ready" }),
      introDone: () => dispatch({ type: "introDone" }),
      fail: (error: string) => dispatch({ type: "fail", error }),
      retry: () => dispatch({ type: "retry" }),
      select: (id: PartId) => {
        dispatch({ type: "select", id });
        track("hero_select", { part: id });
      },
      setColor: (part: PartId, colorId: string) => {
        const c = stateRef.current.config;
        dispatch({ type: "config", next: { ...c, colors: { ...c.colors, [part]: colorOf(colorId).id } } });
        track("hero_interact", { kind: "color", part, color: colorId });
      },
      setMaterial: (material: MaterialId) => {
        if (!MATERIALS[material]) return;
        dispatch({ type: "config", next: { ...stateRef.current.config, material } });
        track("hero_interact", { kind: "material", material });
      },
      setSize: (size: number) => {
        dispatch({ type: "config", next: { ...stateRef.current.config, size } });
        track("hero_interact", { kind: "size", size });
      },
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
      reset: () => dispatch({ type: "reset" }),
      setView: (id: ViewId) => {
        dispatch({ type: "view", id });
        track("hero_interact", { kind: "view", view: id });
      },
      setExploded: (value?: boolean) => {
        dispatch({ type: "explode", value });
        track("hero_interact", { kind: "explode" });
      },
      setAnimating: (value: boolean) => dispatch({ type: "animating", value }),
      spin: () => {
        dispatch({ type: "spin" });
        track("hero_interact", { kind: "spin" });
      },
      setStatic: (value: boolean) => dispatch({ type: "static", value }),
      downgrade: (tier: QualityTier) => dispatch({ type: "downgrade", tier }),
      notify: (kind: Notice["kind"], text: string) => dispatch({ type: "notice", kind, text }),
      checkout: () => {
        dispatch({ type: "checkout" });
        track("lead_submit", { demo: true });
      },
      removeLine: (sku: string) => {
        const cart = stateRef.current.cart.filter((l) => l.sku !== sku);
        dispatch({ type: "cartSet", cart, notice: note(stateRef.current, "info", "장바구니에서 뺐습니다.") });
      },
      addToCart: async () => {
        const s = stateRef.current;
        if (pendingRef.current) return;
        const v = resolveVariant(s.config);
        track("hero_cta_click", { sku: v.sku });
        if (v.stock <= 0) {
          dispatch({ type: "notice", kind: "error", text: `담을 수 없습니다. ${v.reason ?? "품절입니다."}` });
          return;
        }
        const existing = s.cart.find((l) => l.sku === v.sku);
        pendingRef.current = true;
        dispatch({ type: "pending", value: true });
        try {
          await cartAdapter.add(v.sku, s.config.size, existing?.qty ?? 0, v.stock);
          if (!alive.current) return;
          const cur = stateRef.current;
          const label = `${MATERIALS[s.config.material].label} · ${colorOf(s.config.colors.upper).name}`;
          const cart = cur.cart.some((l) => l.sku === v.sku)
            ? cur.cart.map((l) => (l.sku === v.sku ? { ...l, qty: l.qty + 1 } : l))
            : [...cur.cart, { sku: v.sku, label, size: s.config.size, price: v.price, qty: 1, stock: v.stock }];
          dispatch({ type: "cartSet", cart, notice: note(cur, "success", `장바구니에 담았습니다: ${v.sku} (DEMO)`) });
        } catch (e) {
          if (alive.current) dispatch({ type: "notice", kind: "error", text: e instanceof Error ? e.message : "장바구니 담기에 실패했습니다." });
        } finally {
          pendingRef.current = false;
          if (alive.current) dispatch({ type: "pending", value: false });
        }
      },
    }),
    [cartAdapter],
  );

  return { state, actions };
}
export type Actions = ReturnType<typeof useConfigurator>["actions"];
