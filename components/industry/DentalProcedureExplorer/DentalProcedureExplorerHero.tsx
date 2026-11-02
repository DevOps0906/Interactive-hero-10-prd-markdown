"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Panel, { Summary, focusAppointment } from "./Panel";
import { ACCENT, DEMO_DATA, DISCLAIMERS, type DentalData } from "./config";
import { track, useExplorer } from "./useExplorer";
import styles from "./DentalProcedureExplorer.module.css";

const hero = getIndustryHero("clinic-dental-3d");
const POSTER = "/posters/clinic-dental-3d/poster.svg";

// 3D 장면은 클라이언트 전용으로 지연 로딩한다
const Scene = dynamic(() => import("./Scene"), { ssr: false });

/** data: 의료진·진료시간 등 외부 데이터 주입 지점(미지정 시 DEMO 데이터). */
export default function DentalProcedureExplorerHero({ data = DEMO_DATA }: { data?: DentalData }) {
  const { state, actions, reduced, tier, fpsRef } = useExplorer();
  const stageRef = useRef<HTMLDivElement>(null);
  const fallback = state.phase === "fallback";
  const loading = state.phase === "loading";

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || !state.selectedId) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    const id = state.selectedId;
    actions.select(null);
    window.setTimeout(() => document.getElementById(`tooth-btn-${id}`)?.focus(), 0);
  };

  const fullscreen = () => {
    const box = stageRef.current?.closest<HTMLElement>(".hero-stagebox");
    if (!box) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void box.requestFullscreen?.().catch(() => {});
  };

  const vars = { "--hero-accent": ACCENT } as CSSProperties;

  return (
    <div className={styles.root} style={vars} onKeyDown={onKeyDown}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                track("hero_cta_click", { from: "hero" });
                focusAppointment();
              }}
            >
              상담 예약
            </button>
            <p role="status" aria-live="polite">
              {state.selectedId ? `선택한 치아: ${state.selectedId}번` : "아래 치아 번호를 고르거나 3D 치아를 눌러 보세요."} · 데모 화면, {DISCLAIMERS.general}
            </p>
          </>
        }
        overlay={<Summary state={state} actions={actions} data={data} />}
        panel={<Panel state={state} actions={actions} data={data} tierLabel={reduced ? "낮음(모션 감소)" : { low: "낮음", medium: "보통", high: "높음" }[tier]} onFullscreen={fullscreen} />}
      >
        <div className={styles.stage} ref={stageRef}>
          {fallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="" width={640} height={400} />
              <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 치아 번호 선택·절차 안내·예약 폼은 그대로 사용할 수 있습니다.</p>
            </div>
          ) : (
            <Scene state={state} actions={actions} reduced={reduced} tier={tier} fpsRef={fpsRef} />
          )}
          {loading && !fallback && (
            <div className={styles.loading}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="" width={640} height={400} />
              <span className={styles.spinner} aria-hidden="true" />
              <span>3D 치열 불러오는 중…</span>
            </div>
          )}
          <p className={styles.hint}>드래그로 회전 · 치아를 눌러 선택 · 아래에서 절차 단계 확인</p>
        </div>
      </HeroSlot>
    </div>
  );
}
