"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/hero/performance";
import type { HeroState, PointerInput } from "./config";

// 동시 상태 충돌 방지: 허용된 전이만 통과한다.
const ALLOWED: Record<HeroState, readonly HeroState[]> = {
  loading: ["intro", "error"],
  intro: ["idle", "error"],
  idle: ["interacting", "transitioning", "intro", "error"],
  interacting: ["idle", "transitioning", "intro", "error"],
  transitioning: ["idle", "intro", "error"],
  error: ["loading"],
};

const RESUME_DELAY_MS = 1200;

const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};
const readVisible = () => !document.hidden;
const subscribeMotion = (cb: () => void) => subscribeReducedMotion(() => cb());

interface Options {
  /** 이벤트를 받는 히어로 루트 */
  rootRef: RefObject<HTMLElement | null>;
  /** 캔버스 스테이지(좌표 기준) */
  boxRef: RefObject<HTMLElement | null>;
}

export function useHeroInteraction({ rootRef, boxRef }: Options) {
  const [state, setState] = useState<HeroState>("loading");
  const stateRef = useRef<HeroState>("loading");
  const pointer = useRef<PointerInput>({ x: 0, y: 0, inside: false, down: false });
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inView, setInView] = useState(true);

  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const visible = useSyncExternalStore(subscribeVisibility, readVisible, () => true);

  const go = useCallback((next: HeroState) => {
    if (!ALLOWED[stateRef.current].includes(next)) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  /** transitioning/intro 종료 후 현재 입력에 맞는 상태로 복귀 */
  const settle = useCallback(() => {
    go(pointer.current.down ? "interacting" : "idle");
  }, [go]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const p = pointer.current;

    const clearRelease = () => {
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    };
    const release = () => {
      if (!p.down) return;
      p.down = false;
      clearRelease();
      releaseTimer.current = setTimeout(() => {
        releaseTimer.current = null;
        if (stateRef.current === "interacting") go("idle");
      }, RESUME_DELAY_MS);
    };

    const onMove = (e: PointerEvent) => {
      const box = boxRef.current;
      if (!box) return;
      const r = box.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      p.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      p.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      p.inside = Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
    };
    const onLeave = () => {
      p.inside = false;
    };
    const onDown = (e: PointerEvent) => {
      const box = boxRef.current;
      if (!box || !(e.target instanceof Node) || !box.contains(e.target)) return;
      onMove(e);
      p.down = true;
      clearRelease();
      go("interacting");
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") p.inside = false;
      release();
    };
    const onHide = () => {
      p.inside = false;
      release();
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onHide);

    const io = new IntersectionObserver((entries) => {
      const e = entries[entries.length - 1];
      if (e) setInView(e.isIntersecting);
    });
    io.observe(root);

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onHide);
      io.disconnect();
      clearRelease();
    };
  }, [rootRef, boxRef, go]);

  /** 탭 비가시 또는 화면 밖이면 렌더 일시정지 */
  const active = visible && inView;

  return { state, stateRef, go, settle, pointer, reducedMotion, active };
}
