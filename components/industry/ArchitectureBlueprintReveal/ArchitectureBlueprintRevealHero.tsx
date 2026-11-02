"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Blueprint from "./Blueprint";
import Controls from "./Controls";
import Overlay from "./Overlay";
import Scene from "./Scene";
import { ACCENT, CAMERA, DEMO_LABEL, POSTER_SRC } from "./config";
import { trackEvent, useBlueprint } from "./useBlueprint";
import styles from "./ArchitectureBlueprintReveal.module.css";

const hero = getIndustryHero("architecture-building-reveal");

export default function ArchitectureBlueprintRevealHero() {
  const { state, actions, reduced, tier, fpsRef } = useBlueprint();
  const { phase, replayN, tourStep, tourAuto } = state;
  const stageRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [visible, setVisible] = useState(true);
  const [tabShown, setTabShown] = useState(true);
  const fallback = phase === "fallback";

  useEffect(() => {
    trackEvent("hero_view");
  }, []);

  // 화면 밖·탭 숨김이면 렌더 루프 중단
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setTabShown(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // 벽시계 데드라인: 도면·전환이 멈춰도(저프레임·백그라운드 탭) 반드시 완성 상태가 된다
  useEffect(() => {
    if (phase !== "blueprint" && phase !== "morphing") return;
    const id = window.setTimeout(actions.ready, CAMERA.deadlineMs);
    return () => window.clearTimeout(id);
  }, [phase, replayN, actions]);

  // 카메라 투어 자동 진행
  useEffect(() => {
    if (!tourAuto || tourStep < 0 || tourStep >= 3) return;
    const id = window.setTimeout(() => actions.tour(tourStep + 1), CAMERA.tourStepMs);
    return () => window.clearTimeout(id);
  }, [tourAuto, tourStep, actions]);

  const openInquiry = useCallback(() => {
    const f = formRef.current;
    if (!f) return;
    f.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    f.querySelector<HTMLElement>("select, input")?.focus({ preventScroll: true });
  }, [reduced]);

  const cta = (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          trackEvent("hero_cta_click", { from: "hero" });
          openInquiry();
        }}
      >
        상담 프로젝트 문의
      </button>
      <button type="button" className="btn-ghost" disabled={phase !== "ready"} onClick={() => actions.tour(0)}>
        카메라 투어 보기
      </button>
      <p>{DEMO_LABEL} 화면 · 수치와 재질은 예시입니다.</p>
    </>
  );

  return (
    <div className={styles.root} style={{ "--hero-accent": ACCENT } as React.CSSProperties}>
      <HeroSlot
        hero={hero}
        cta={cta}
        overlay={<Overlay state={state} actions={actions} onInquiry={openInquiry} />}
        panel={<Controls state={state} actions={actions} tier={tier} reduced={reduced} formRef={formRef} />}
      >
        <div ref={stageRef} className={styles.stage} data-time={state.config.time} data-phase={phase}>
          {!fallback && <Scene state={state} actions={actions} reduced={reduced} tier={tier} fpsRef={fpsRef} active={visible && tabShown} />}
          <Blueprint phase={phase} replayN={replayN} reduced={reduced} onDrawn={actions.morph} onSkip={actions.ready} />
          {fallback && (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER_SRC} alt="" width={480} height={360} />
              <p>3D 화면을 표시할 수 없어 도면 이미지로 대체했습니다. 아래 패널에서 층 정보와 상담 문의를 이용할 수 있습니다.</p>
            </div>
          )}
          <p className={styles.hint}>드래그로 회전 · 건물 클릭 또는 아래 목록으로 층 선택</p>
        </div>
      </HeroSlot>
    </div>
  );
}
