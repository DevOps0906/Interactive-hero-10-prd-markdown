"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HEROES, heroHref } from "@/lib/hero/registry";
import { ThemeToggle } from "./ThemeToggle";
import { useGnbMode } from "./useGnbMode";

const KEY = "hero-lab-gnb-collapsed";
const listeners = new Set<() => void>();
const subscribeCollapsed = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const readCollapsed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const mode = useGnbMode(collapsed);
  const [open, setOpen] = useState(false);
  const openBtn = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const drawerOpen = open && mode === "drawer";

  // 드로어 구간을 벗어나면 열림 상태를 버린다(다시 모바일로 줄였을 때 저절로 열리지 않게).
  const [prevMode, setPrevMode] = useState(mode);
  if (prevMode !== mode) {
    setPrevMode(mode);
    if (mode !== "drawer") setOpen(false);
  }

  const setDrawer = useCallback((next: boolean) => {
    setOpen(next);
    // inert 해제 직후 포커스 이동을 위해 다음 프레임에 실행
    requestAnimationFrame(() => (next ? closeBtn : openBtn).current?.focus());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawer]);

  function toggleCollapsed() {
    try {
      localStorage.setItem(KEY, collapsed ? "0" : "1");
    } catch {}
    listeners.forEach((l) => l());
  }

  return (
    <div className="shell" data-collapsed={collapsed} data-drawer-open={drawerOpen}>
      <header className="topbar" inert={drawerOpen}>
        <button
          ref={openBtn}
          type="button"
          className="btn-ghost"
          aria-label="메뉴 열기"
          aria-controls="gnb"
          aria-expanded={drawerOpen}
          onClick={() => setDrawer(true)}
        >
          메뉴
        </button>
        <span className="brand">
          Nomad-Hero-<b>Lab</b>
        </span>
      </header>
      <div className="scrim" aria-hidden="true" onClick={() => setDrawer(false)} />

      <nav className="gnb" id="gnb" aria-label="주 메뉴" inert={mode === "drawer" && !drawerOpen}>
        <div className="gnb-head">
          <Link href="/" className="brand">
            Nomad-Hero-<b>Lab</b>
          </Link>
          <button ref={closeBtn} type="button" className="btn-ghost btn-close" aria-label="메뉴 닫기" onClick={() => setDrawer(false)}>
            닫기
          </button>
          <button type="button" className="btn-ghost btn-collapse" aria-label="사이드바 접기" aria-pressed={collapsed} onClick={toggleCollapsed}>
            접기
          </button>
        </div>
        <ul className="gnb-list">
          {HEROES.map((h) => {
            const href = heroHref(h.slug);
            return (
              <li key={h.slug}>
                <Link
                  href={href}
                  className="gnb-item"
                  aria-current={pathname === href ? "page" : undefined}
                  aria-label={mode === "rail" ? `${h.no} ${h.title}` : undefined}
                  onClick={() => {
                    if (drawerOpen) setDrawer(false);
                  }}
                >
                  <span className="no">{h.no}</span>
                  <span className="label">{h.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="gnb-foot">
          <ThemeToggle />
        </div>
      </nav>

      {/* 드로어가 열려 있으면 본문을 비활성화해 포커스·스크린리더가 배경으로 새지 않게 한다. */}
      <main inert={drawerOpen}>{children}</main>
    </div>
  );
}
