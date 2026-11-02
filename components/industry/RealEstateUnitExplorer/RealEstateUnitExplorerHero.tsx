"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Overlay from "./Overlay";
import Panel from "./Panel";
import { DEMO_LABEL, STATUS_META, unitLabel } from "./config";
import { mockAdapter } from "./data";
import type { UnitsAdapter } from "./types";
import { track, useExplorer } from "./useExplorer";
import styles from "./RealEstateUnitExplorer.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const hero = getIndustryHero("realestate-unit-explorer");
const POSTER = "/posters/realestate-unit-explorer/poster.svg";

/** adapter: 매물 데이터 주입 지점(미지정 시 샘플 mockAdapter). */
export default function RealEstateUnitExplorerHero({ adapter = mockAdapter }: { adapter?: UnitsAdapter }) {
  const units = useMemo(() => adapter.load(), [adapter]);
  const { state, actions, viewUnits, reduced, fpsRef } = useExplorer(units);
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [tabOn, setTabOn] = useState(true);

  const viewById = useMemo(() => new Map(viewUnits.map((u) => [u.id, u])), [viewUnits]);
  const viewSelected = state.selectedId ? (viewById.get(state.selectedId) ?? null) : null;
  const fallback = state.phase === "fallback";
  const loading = state.phase === "loading";
  const active = visible && tabOn;

  // 화면 밖·탭 숨김이면 렌더 중단
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const onVis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, []);

  const close = useCallback(() => {
    const id = state.selectedId;
    actions.select(null);
    // 포커스 복귀: 목록의 해당 호실 버튼, 없으면 CTA
    requestAnimationFrame(() => {
      const btn = id ? document.querySelector<HTMLElement>(`[data-unit-btn="${id}"]`) : null;
      (btn ?? ctaRef.current)?.focus();
    });
  }, [state.selectedId, actions]);

  // ESC: 호실 요약 닫기 (입력 중에는 제외)
  useEffect(() => {
    if (!state.selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedId, close]);

  const goInquiry = useCallback(() => {
    track("hero_cta_click", state.selectedId ? { unit: state.selectedId } : {});
    const el = formRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }, [state.selectedId, reduced]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  }, []);

  const availableCount = viewUnits.filter((u) => u.status === "available").length;

  return (
    <div ref={rootRef} className={styles.root}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <button ref={ctaRef} type="button" className="btn-primary" onClick={goInquiry}>
              관심 호실 문의
            </button>
            <p>
              <b className={styles.demoTag}>{DEMO_LABEL}</b>{" "}
              {viewSelected ? `선택: ${unitLabel(viewSelected)} · ${STATUS_META[viewSelected.status].label}` : `분양 가능 ${availableCount}호 (샘플) · 건물에서 호실을 눌러 보세요`}
            </p>
          </>
        }
        overlay={<Overlay state={state} actions={actions} unit={viewSelected} fullscreen={fullscreen} onFullscreen={toggleFullscreen} onClose={close} onInquiry={goInquiry} />}
        panel={<Panel units={viewUnits} byId={viewById} state={state} actions={actions} fpsRef={fpsRef} formRef={formRef} />}
      >
        <div className={styles.stage}>
          {fallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="" width={480} height={320} />
              <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 패널의 층·호실 목록과 문의 폼은 그대로 사용할 수 있습니다.</p>
            </div>
          ) : (
            <Scene units={units} state={state} actions={actions} reduced={reduced} active={active} fpsRef={fpsRef} />
          )}
          {loading && (
            <div className={styles.loading}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="" width={480} height={320} />
              <span className={styles.spinner} aria-hidden="true" />
              <span>3D 건물 불러오는 중…</span>
            </div>
          )}
          <p className={styles.hint}>드래그로 회전 · 호실을 눌러 선택 · 아래 패널에서 층·시점 선택</p>
        </div>
      </HeroSlot>
    </div>
  );
}
