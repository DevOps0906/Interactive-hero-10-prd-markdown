"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { PointerState } from "./config";

/** 컨테이너 기준 포인터 좌표·속도와 클릭 큐를 관리한다. 언마운트 시 리스너를 모두 해제. */
export function useHeroInteraction(containerRef: RefObject<HTMLElement | null>) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, vx: 0, vy: 0, inside: false, down: false, lastMove: 0 });
  const clicks = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const p = pointer.current;
    let lastT = 0;

    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      const now = performance.now();
      if (p.inside && lastT) {
        const dt = Math.max((now - lastT) / 1000, 0.008);
        p.vx += ((x - p.x) / dt - p.vx) * 0.35;
        p.vy += ((y - p.y) / dt - p.vy) * 0.35;
      }
      p.x = x;
      p.y = y;
      p.inside = true;
      p.lastMove = now;
      lastT = now;
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      p.down = true;
      clicks.current.push({ x: p.x, y: p.y });
      if (clicks.current.length > 4) clicks.current.shift();
    };
    const onUp = () => {
      p.down = false;
    };
    const onLeave = () => {
      p.inside = false;
      p.down = false;
      lastT = 0;
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onLeave);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onLeave);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [containerRef]);

  return { pointer, clicks };
}
