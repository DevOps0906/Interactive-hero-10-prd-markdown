"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle() {
  // 서버는 다크 기본(layout의 html class)과 같게 그린다.
  const dark = useSyncExternalStore(subscribe, isDark, () => true);
  function toggle() {
    const next = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("hero-lab-theme", next ? "dark" : "light");
    } catch {}
    listeners.forEach((l) => l());
  }
  return (
    <button type="button" className="btn-ghost" onClick={toggle} aria-pressed={dark} aria-label={`다크 테마 ${dark ? "켜짐" : "꺼짐"}`}>
      테마
    </button>
  );
}
