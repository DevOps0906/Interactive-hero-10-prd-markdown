"use client";

import { useEffect, useMemo, useReducer, useRef, type RefObject } from "react";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import {
  HOME_POSE, JOINT_BY_ID, LEVELS, PRESETS, isUnlocked, levelIndex,
  type Command, type LevelId, type ModuleId, type Pose, type ViewMode,
} from "./config";
import { checkSafety, clampIk, clampJoint, forward, solveIk, type IkTarget, type Safety } from "./kinematics";

export type Phase = "loading" | "intro" | "ready" | "fallback";
export interface IkState extends IkTarget { on: boolean }
interface Snapshot { angles: Pose; ik: IkState }

export interface LabState {
  phase: Phase;
  level: LevelId;
  /** 선택된 모듈(관절+부품 묶음). HTML 패널과 3D 하이라이트가 같은 값을 쓴다. */
  selectedId: ModuleId | null;
  viewMode: ViewMode;
  /** 수동 관절각(°, 그리퍼 %). IK/재생 중의 실제 포즈는 pose 파생값 참고 */
  angles: Pose;
  ik: IkState;
  exploded: boolean;
  queue: Command[];
  presetId: string | null;
  activeIndex: number;
  running: boolean;
  history: Snapshot[];
  sheetOpen: boolean;
  tier: QualityTier;
  reduced: boolean;
  visible: boolean;
  error: string | null;
  notice: string;
}

type Action =
  | { type: "ready" } | { type: "introDone" } | { type: "fail"; error: string }
  | { type: "env"; reduced?: boolean; tier?: QualityTier; visible?: boolean }
  | { type: "downgrade"; tier: QualityTier }
  | { type: "level"; level: LevelId } | { type: "select"; id: ModuleId | null } | { type: "view"; mode: ViewMode }
  | { type: "beginEdit" } | { type: "joint"; id: ModuleId; value: number }
  | { type: "ik"; patch: Partial<IkTarget> } | { type: "ikToggle" }
  | { type: "explode" } | { type: "preset"; id: string }
  | { type: "play" } | { type: "advance" } | { type: "stop" }
  | { type: "addPose" } | { type: "removeCommand"; id: string } | { type: "clearQueue" }
  | { type: "undo" } | { type: "reset" } | { type: "sheet"; open?: boolean };

const HISTORY_MAX = 30;
const INITIAL_IK: IkState = { on: false, x: 1.6, y: 1.4, z: 0 };

export const effectivePose = (s: Pick<LabState, "angles" | "ik" | "running">): Pose =>
  s.ik.on && !s.running ? solveIk(s.ik, s.angles).pose : s.angles;

const snap = (s: LabState): Snapshot => ({ angles: s.angles, ik: s.ik });
const pushHistory = (s: LabState): Snapshot[] => [...s.history.slice(-(HISTORY_MAX - 1)), snap(s)];
const canEditQueue = (s: LabState) => isUnlocked("intermediate", s.level) && !s.running;
const editable = (s: LabState) => s.phase === "ready" && !s.running;

function reducer(s: LabState, a: Action): LabState {
  switch (a.type) {
    case "ready":
      return s.phase === "loading" ? { ...s, phase: "intro" } : s;
    case "introDone":
      return s.phase === "intro" ? { ...s, phase: "ready" } : s;
    case "fail":
      return { ...s, phase: "fallback", error: a.error, running: false };
    case "env":
      return { ...s, reduced: a.reduced ?? s.reduced, tier: a.tier ?? s.tier, visible: a.visible ?? s.visible };
    case "downgrade":
      return { ...s, tier: a.tier };
    case "level": {
      if (s.level === a.level) return s;
      const ik = isUnlocked("advanced", a.level) ? s.ik : { ...s.ik, on: false };
      // IK 가 켜져 있었다면 현재 포즈를 수동값으로 확정해 점프를 막는다
      const angles = s.ik.on && !ik.on ? effectivePose(s) : s.angles;
      return { ...s, level: a.level, ik, angles, notice: `학습 레벨: ${LEVELS.find((l) => l.id === a.level)?.label ?? a.level}` };
    }
    case "select":
      return { ...s, selectedId: s.selectedId === a.id ? null : a.id };
    case "view":
      return { ...s, viewMode: a.mode };
    case "beginEdit":
      return editable(s) ? { ...s, history: pushHistory(s) } : s;
    case "joint": {
      const j = JOINT_BY_ID[a.id];
      if (!editable(s) || !isUnlocked(j.minLevel, s.level) || (s.ik.on && a.id !== "gripper")) return s;
      return { ...s, angles: { ...s.angles, [a.id]: clampJoint(a.id, a.value) }, selectedId: a.id, presetId: s.presetId };
    }
    case "ik":
      return editable(s) && s.ik.on ? { ...s, ik: { ...s.ik, ...clampIk({ ...s.ik, ...a.patch }) } } : s;
    case "ikToggle": {
      if (!editable(s) || !isUnlocked("advanced", s.level)) return s;
      if (s.ik.on) return { ...s, history: pushHistory(s), angles: effectivePose(s), ik: { ...s.ik, on: false } };
      const tip = forward(s.angles).tip;
      return { ...s, history: pushHistory(s), ik: { on: true, ...clampIk({ x: tip[0], y: tip[1], z: tip[2] }) } };
    }
    case "explode":
      return { ...s, exploded: !s.exploded };
    case "preset": {
      const p = PRESETS.find((x) => x.id === a.id);
      if (!p || s.phase !== "ready" || s.running) return s;
      return { ...s, queue: p.commands, presetId: p.id, activeIndex: -1 };
    }
    case "play": {
      if (s.phase !== "ready" || s.running || s.queue.length === 0) return s;
      // 재생 중에는 IK 를 끄고 현재 포즈에서 시작한다
      const start = effectivePose(s);
      return { ...s, history: pushHistory({ ...s, angles: start, ik: { ...s.ik, on: false } }), ik: { ...s.ik, on: false }, running: true, activeIndex: 0, angles: s.queue[0].pose, notice: "명령 실행 중" };
    }
    case "advance": {
      if (!s.running) return s;
      const next = s.activeIndex + 1;
      if (next < s.queue.length) return { ...s, activeIndex: next, angles: s.queue[next].pose };
      return { ...s, running: false, activeIndex: -1, notice: "명령 실행을 마쳤어요" };
    }
    case "stop":
      return s.running ? { ...s, running: false, activeIndex: -1, notice: "명령 실행을 멈췄어요" } : s;
    case "addPose": {
      if (!canEditQueue(s)) return s;
      const n = s.queue.length + 1;
      const cmd: Command = { id: `user-${Date.now().toString(36)}-${n}`, label: `내 포즈 ${n}`, pose: effectivePose(s), ms: 800 };
      return { ...s, queue: [...s.queue, cmd], presetId: null, notice: `명령 ${n}개` };
    }
    case "removeCommand":
      return canEditQueue(s) ? { ...s, queue: s.queue.filter((c) => c.id !== a.id), presetId: null } : s;
    case "clearQueue":
      return canEditQueue(s) ? { ...s, queue: [], presetId: null, activeIndex: -1 } : s;
    case "undo": {
      const prev = s.history[s.history.length - 1];
      if (!prev || s.phase === "fallback") return s;
      return { ...s, history: s.history.slice(0, -1), angles: prev.angles, ik: prev.ik, running: false, activeIndex: -1, notice: "되돌렸어요" };
    }
    case "reset":
      return { ...s, history: pushHistory(s), angles: HOME_POSE, ik: INITIAL_IK, exploded: false, selectedId: null, viewMode: "home", running: false, activeIndex: -1, notice: "초기 상태로 돌아갔어요" };
    case "sheet":
      return { ...s, sheetOpen: a.open ?? !s.sheetOpen };
  }
}

const initial: LabState = {
  phase: "loading", level: "beginner", selectedId: null, viewMode: "home", angles: HOME_POSE, ik: INITIAL_IK, exploded: false,
  queue: PRESETS[0].commands, presetId: PRESETS[0].id, activeIndex: -1, running: false, history: [], sheetOpen: false,
  tier: "medium", reduced: false, visible: true, error: null, notice: "",
};

/** 측정 이벤트: 개인정보 없이 window 로 전달한다(분석 도구는 hero:event 를 구독). */
export function track(name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, hero: "academy-robot-lab", ...detail } }));
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const LOAD_DEADLINE_MS = 9000;
export const INTRO_MS = 1300;

export function useLab(stageRef: RefObject<HTMLElement | null>) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { phase, reduced, running, activeIndex, queue } = state;
  const fpsRef = useRef(60);

  // 환경: WebGL 지원·모션 감소·품질 등급·뷰포트 가시성
  useEffect(() => {
    if (!hasWebGL()) {
      dispatch({ type: "fail", error: "이 브라우저는 WebGL 을 지원하지 않아요." });
      return;
    }
    const tier: QualityTier = window.innerWidth < 768 ? "low" : detectQualityTier();
    dispatch({ type: "env", reduced: prefersReducedMotion(), tier });
    const off = subscribeReducedMotion((r) => dispatch({ type: "env", reduced: r }));
    return off;
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    let inView = true;
    const apply = () => dispatch({ type: "env", visible: inView && document.visibilityState === "visible" });
    const io = el ? new IntersectionObserver((e) => { inView = e[0]?.isIntersecting ?? true; apply(); }) : null;
    if (el) io?.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
  }, [stageRef]);

  // 벽시계 기준 데드라인: 로딩이 길면 폴백, 인트로는 프레임 수와 무관하게 끝난다
  useEffect(() => {
    if (phase !== "loading") return;
    const id = window.setTimeout(() => dispatch({ type: "fail", error: "3D 로딩이 오래 걸려 정지 화면으로 대체했어요." }), LOAD_DEADLINE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);
  useEffect(() => {
    if (phase !== "intro") return;
    const id = window.setTimeout(() => {
      dispatch({ type: "introDone" });
      track("hero_view");
    }, reduced ? 0 : INTRO_MS);
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  // 명령 큐 재생: 단계마다 타이머, 언마운트·정지 시 정리
  useEffect(() => {
    if (!running) return;
    const cmd = queue[activeIndex];
    if (!cmd) return;
    const id = window.setTimeout(() => dispatch({ type: "advance" }), reduced ? Math.min(cmd.ms, 300) : cmd.ms);
    return () => window.clearTimeout(id);
  }, [running, activeIndex, queue, reduced]);

  const pose = useMemo(() => effectivePose(state), [state]);
  const ikInfo = useMemo(() => (state.ik.on ? solveIk(state.ik, state.angles) : null), [state.ik, state.angles]);
  const safety: Safety = useMemo(() => checkSafety(pose), [pose]);

  const actions = useMemo(() => ({
    ready: () => dispatch({ type: "ready" }),
    fail: (error: string) => dispatch({ type: "fail", error }),
    downgrade: (tier: QualityTier) => dispatch({ type: "downgrade", tier }),
    setLevel: (level: LevelId) => { dispatch({ type: "level", level }); track("hero_interact", { control: "level", level }); },
    select: (id: ModuleId | null) => { dispatch({ type: "select", id }); if (id) track("hero_select", { id }); },
    setView: (mode: ViewMode) => dispatch({ type: "view", mode }),
    beginEdit: () => dispatch({ type: "beginEdit" }),
    setJoint: (id: ModuleId, value: number) => { dispatch({ type: "joint", id, value }); },
    setIk: (patch: Partial<IkTarget>) => dispatch({ type: "ik", patch }),
    toggleIk: () => { dispatch({ type: "ikToggle" }); track("hero_interact", { control: "ik" }); },
    toggleExplode: () => { dispatch({ type: "explode" }); track("hero_interact", { control: "explode" }); },
    loadPreset: (id: string) => { dispatch({ type: "preset", id }); track("hero_interact", { control: "preset", id }); },
    play: () => { dispatch({ type: "play" }); track("hero_interact", { control: "play" }); },
    stop: () => dispatch({ type: "stop" }),
    addPose: () => dispatch({ type: "addPose" }),
    removeCommand: (id: string) => dispatch({ type: "removeCommand", id }),
    clearQueue: () => dispatch({ type: "clearQueue" }),
    undo: () => dispatch({ type: "undo" }),
    reset: () => dispatch({ type: "reset" }),
    setSheet: (open?: boolean) => dispatch({ type: "sheet", open }),
  }), []);

  const isAnimating = state.running || state.phase === "intro";
  const levelNumber = levelIndex(state.level);
  return { state, actions, pose, ikInfo, safety, isAnimating, fpsRef, levelNumber };
}

export type LabActions = ReturnType<typeof useLab>["actions"];
