"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Overlay from "./Overlay";
import Panel from "./Panel";
import Scene from "./Scene";
import { DEMO_DATA, DEMO_LABEL, VIEW_LABEL, track, type CampusData } from "./config";
import { useCampusTour } from "./useCampusTour";
import styles from "./VirtualCampusTour.module.css";

const hero = getIndustryHero("academy-virtual-campus");

/** data: 외부 데이터 주입 지점(어댑터). 미지정 시 데모 데이터. */
export default function VirtualCampusTourHero({ data = DEMO_DATA }: { data?: CampusData }) {
  const { state, actions, reduced, tier, downgrade } = useCampusTour(data);
  const { phase, selectedId, viewMode, tourIndex, isAnimating, error } = state;
  const stageRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  // Esc: 선택 해제(전체화면 중 Esc 는 브라우저가 먼저 전체화면을 닫는다) 후 포커스를 툴바로 되돌린다.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.fullscreenElement) return;
      actions.select(null);
      overviewRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId, actions]);

  const toggleFullscreen = useCallback(() => {
    const box = stageRef.current?.closest<HTMLElement>(".hero-stagebox");
    if (!box) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void box.requestFullscreen?.().catch(() => undefined);
  }, []);

  const toBooking = () => {
    track("hero_cta_click", { cta: "visit_booking", from: "hero" });
    document.getElementById("campus-booking")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("booking-date")?.focus({ preventScroll: true }), 400);
  };

  const selectedName = data.spaces.find((s) => s.id === selectedId)?.name ?? "없음(전경)";
  const status = `선택: ${selectedName} · 보기: ${VIEW_LABEL[viewMode]}${tourIndex >= 0 ? " · 가이드 투어 진행 중" : ""}${isAnimating ? " · 카메라 이동 중" : ""}`;
  const vars = { "--hero-bg": "#0b0e14", "--hero-fg": "#eef0f3", "--hero-accent": "#3fd0bd" } as CSSProperties;

  return (
    <div className={styles.root} style={vars}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <button type="button" className="btn-primary" onClick={toBooking}>상담·시설 방문 예약</button>
            <p role="status" aria-live="polite">{status}</p>
            <p>{DEMO_LABEL} · 3D는 단순 모형입니다.</p>
          </>
        }
        overlay={<Overlay data={data} state={state} actions={actions} fullscreen={fullscreen} onFullscreen={toggleFullscreen} overviewRef={overviewRef} />}
        panel={<Panel data={data} state={state} actions={actions} />}
      >
        <div ref={stageRef} className={styles.stage}>
          {phase === "fallback" ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/posters/academy-virtual-campus/poster.svg" alt="" width={560} height={360} />
              <p>{error || "3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다."} 아래 공간 목록·비교·예약 폼은 그대로 사용할 수 있습니다.</p>
            </div>
          ) : (
            <Scene
              data={data}
              selectedId={selectedId}
              viewMode={viewMode}
              shotKey={state.shotKey}
              reduced={reduced}
              tier={tier}
              onSelect={actions.select}
              onArrive={actions.arrive}
              onReady={actions.ready}
              onFail={actions.fail}
              onDowngrade={downgrade}
            />
          )}
          {phase === "loading" && (
            <div className={styles.loading}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/posters/academy-virtual-campus/poster.svg" alt="" width={560} height={360} />
              <span className={styles.spinner} aria-hidden="true" />
              <span>3D 캠퍼스 불러오는 중…</span>
            </div>
          )}
        </div>
      </HeroSlot>
    </div>
  );
}
