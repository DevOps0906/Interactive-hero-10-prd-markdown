"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Controls from "./Controls";
import { POSTER_URL, getRegion } from "./config";
import { track, useExplorer } from "./useExplorer";
import styles from "./AnatomyCareExplorer.module.css";

const hero = getIndustryHero("hospital-anatomy-explorer");
const Scene = dynamic(() => import("./Scene"), { ssr: false });
const LOAD_DEADLINE_MS = 8000;
const subscribeNone = () => () => {};

/** 화면 밖·탭 숨김이면 false → 렌더 루프 중단. */
function useStageActive(ref: React.RefObject<HTMLElement | null>) {
  const [inView, setInView] = useState(true);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    const io = el ? new IntersectionObserver(([e]) => setInView(e.isIntersecting)) : null;
    if (el && io) io.observe(el);
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);
  return inView && visible;
}

export default function AnatomyCareExplorerHero() {
  const { state, actions, reduced, tier } = useExplorer();
  const stageRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef(0);
  const active = useStageActive(stageRef);
  const [isFs, setIsFs] = useState(false);
  const fsSupported = useSyncExternalStore(subscribeNone, () => document.fullscreenEnabled, () => false);
  const region = getRegion(state.selectedId);
  const fallback = state.phase === "fallback";
  const loading = state.phase === "loading";

  // 로딩이 끝나지 않아도(느린 네트워크) 벽시계 기준으로 포스터+HTML 로 전환한다.
  const { fail } = actions;
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(() => fail("3D 로딩 시간이 초과되었습니다."), LOAD_DEADLINE_MS);
    return () => window.clearTimeout(t);
  }, [loading, fail]);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const stagebox = () => stageRef.current?.closest<HTMLElement>(".hero-stagebox") ?? null;
  const toggleFullscreen = useCallback(() => {
    track("hero_interact", { control: "fullscreen" });
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void stagebox()?.requestFullscreen?.().catch(() => undefined);
  }, []);

  // 닫기: 선택 해제 후 직전 트리거(부위 버튼)로 포커스 복귀
  const close = useCallback(() => {
    const id = state.selectedId;
    actions.select(null);
    if (id) window.requestAnimationFrame(() => document.getElementById(`ace-region-${id}`)?.focus());
  }, [actions, state.selectedId]);

  useEffect(() => {
    if (!state.selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selectedId, close]);

  const goBooking = () => {
    track("hero_cta_click", { cta: "primary" });
    const el = document.getElementById("ace-booking");
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    el?.focus({ preventScroll: true });
  };

  return (
    <div className={styles.root}>
      <HeroSlot
        hero={hero}
        kicker={`${hero.no} / 10 · 데모`}
        cta={
          <>
            <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={goBooking}>
              진료과 안내/예약
            </button>
            <p role="status" aria-live="polite">
              {region ? `선택한 부위: ${region.label} (${region.department})` : "선택한 부위 없음 — 모델의 마커나 아래 목록에서 선택하세요."}
              {state.isAnimating ? " · 시점 이동 중" : ""}
            </p>
            <p>데모 콘텐츠이며 진단·치료 효과를 뜻하지 않습니다.</p>
          </>
        }
        overlay={
          <>
            <div className={styles.toolbar} role="toolbar" aria-label="3D 조작">
              <button type="button" className={styles.tbtn} onClick={actions.undo} disabled={state.history.length === 0}>되돌리기</button>
              <button type="button" className={styles.tbtn} onClick={actions.reset}>초기화</button>
              <button type="button" className={styles.tbtn} onClick={toggleFullscreen} disabled={!fsSupported} aria-pressed={isFs}>
                {isFs ? "전체화면 종료" : "전체화면"}
              </button>
            </div>
            {loading && (
              <div className={styles.loading} role="status">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={POSTER_URL} alt="" width={480} height={360} />
                <span>3D 모델 불러오는 중…</span>
              </div>
            )}
            {!loading && !fallback && !region && <p className={styles.hint}>마커를 눌러 부위를 선택 · 드래그로 회전 (세로 스크롤은 그대로)</p>}
            {region && (
              <div className={styles.sheet} role="region" aria-label={`${region.label} 요약`}>
                <div>
                  <strong>{region.label}</strong>
                  <span>{region.department}</span>
                </div>
                <div className={styles.sheetBtns}>
                  <button type="button" className={`${styles.tbtn} ${styles.tprimary}`} onClick={goBooking}>상세·예약</button>
                  <button type="button" className={styles.tbtn} onClick={close} aria-label="선택 닫기">닫기</button>
                </div>
              </div>
            )}
          </>
        }
        panel={<Controls state={state} actions={actions} reduced={reduced} tier={tier} fpsRef={fpsRef} />}
      >
        <div ref={stageRef} className={styles.stage}>
          {fallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER_URL} alt="" width={480} height={360} />
              <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 목록에서 동일한 내용을 확인하고 예약할 수 있습니다.</p>
            </div>
          ) : (
            <Scene state={state} actions={actions} reduced={reduced} tier={tier} active={active} fpsRef={fpsRef} />
          )}
        </div>
      </HeroSlot>
    </div>
  );
}
