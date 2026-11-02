"use client";

import { useSyncExternalStore } from "react";

export type GnbMode = "drawer" | "rail" | "full";

const TABLET = "(width >= 768px)";
const DESKTOP = "(width >= 1200px)";

function subscribe(cb: () => void) {
  const a = window.matchMedia(TABLET);
  const b = window.matchMedia(DESKTOP);
  a.addEventListener("change", cb);
  b.addEventListener("change", cb);
  return () => {
    a.removeEventListener("change", cb);
    b.removeEventListener("change", cb);
  };
}

const snapshot = () => (window.matchMedia(DESKTOP).matches ? 2 : window.matchMedia(TABLET).matches ? 1 : 0);

/** 3구간 분기는 이 훅 한 곳에서만 한다. collapsed는 데스크톱에서만 의미가 있다. */
export function useGnbMode(collapsed: boolean): GnbMode {
  const band = useSyncExternalStore(subscribe, snapshot, () => 2);
  if (band === 0) return "drawer";
  if (band === 1 || collapsed) return "rail";
  return "full";
}
