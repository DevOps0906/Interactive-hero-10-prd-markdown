"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import Panel, { type Track } from "./Panel";
import { ACCENT, DEMO_LABEL, MOCK_SERVICES, POSTER_SRC } from "./config";
import type { ServiceAdapter } from "./types";
import { useJourneyState } from "./useJourneyState";
import styles from "./LegalCaseJourney.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const hero = getIndustryHero("legal-case-journey");
const LOAD_TIMEOUT_MS = 8000;
const noopSubscribe = () => () => undefined;

/** 측정 이벤트: 개인정보 없이 window 이벤트로만 내보낸다(분석 도구 연결 지점). */
const track: Track = (name, payload) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("hero:event", { detail: { hero: hero.slug, name, ...payload } }));
};

/** services: 외부 데이터 adapter 주입 지점(미지정 시 데모 mockData). */
export default function LegalCaseJourneyHero({ services: adapter }: { services?: ServiceAdapter }) {
  const services = useMemo(() => (adapter ? adapter() : MOCK_SERVICES), [adapter]);
  const { state, actions } = useJourneyState(services);
  const service = services.find((s) => s.id === state.selectedId) ?? services[0];
  const step = service.steps[state.stepIndex] ?? service.steps[0];

  const reduced = useSyncExternalStore(
    (cb) => subscribeReducedMotion(cb),
    prefersReducedMotion,
    () => false,
  );
  const baseTier = useSyncExternalStore(noopSubscribe, detectQualityTier, () => "medium" as QualityTier);
  const [capped, setTier] = useState<QualityTier | null>(null);
  const tier = capped ?? baseTier;
  const [visible, setVisible] = useState(true);
  const [tabShown, setTabShown] = useState(true);
  const canFullscreen = useSyncExternalStore(noopSubscribe, () => !!document.fullscreenEnabled, () => false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track("hero_view");
    // WebGL 비지원이면 즉시 포스터 폴백
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) actions.fail();
  }, [actions]);

  // 3D 로딩이 끝나지 않으면 포스터 폴백
  const loading = state.phase === "loading";
  useEffect(() => {
    if (!loading) return;
    const t = window.setTimeout(actions.fail, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [loading, actions]);

  // 화면 밖·탭 숨김이면 렌더 중단
  useEffect(() => {
    const el = stageRef.current;
    const io = el ? new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 }) : null;
    if (el && io) io.observe(el);
    const onVis = () => setTabShown(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen?.().catch(() => undefined);
  }, []);
  const onCta = useCallback(() => {
    track("hero_cta_click", { service: service.id });
    const form = document.getElementById("lcj-intake");
    form?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    document.getElementById("lcj-name")?.focus({ preventScroll: true });
  }, [service.id]);

  const fallback = state.phase === "fallback";

  return (
    <div className={styles.root} style={{ "--hero-accent": ACCENT } as React.CSSProperties}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <button type="button" className={styles.primaryBtn} onClick={onCta}>
              업무 상담 신청
            </button>
            <span className={styles.demo}>{DEMO_LABEL}</span>
            <p className={styles.ctaNote}>절차 이해용 데모 안내입니다. 법률 결과를 보장하지 않으며 기간·비용은 상담에서 안내됩니다.</p>
          </>
        }
        overlay={
          <div className={styles.overlay}>
            {loading && (
              <div className={styles.loading} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <span>3D 장면 불러오는 중…</span>
              </div>
            )}
            <p className={styles.badge}>
              {service.label} · {state.viewMode === "documents" ? "준비 서류" : `${state.stepIndex + 1}/${service.steps.length} ${step.label}`}
            </p>
            <p className={styles.hint}>{fallback ? "정지 이미지로 대체됨" : "3D 모형을 클릭하거나 아래에서 단계를 고르세요"}</p>
          </div>
        }
        panel={<Panel services={services} service={service} state={state} actions={actions} track={track} canFullscreen={canFullscreen} onFullscreen={onFullscreen} onCta={onCta} />}
      >
        <div ref={stageRef} className={styles.stage}>
          {fallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER_SRC} alt="" width={640} height={420} />
              <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 컨트롤과 상담 신청 폼은 그대로 사용할 수 있습니다.</p>
            </div>
          ) : (
            <Scene
              service={service}
              state={state}
              actions={actions}
              reduced={reduced}
              tier={tier}
              active={visible && tabShown}
              autoQuality
              onDowngrade={setTier}
            />
          )}
        </div>
      </HeroSlot>
    </div>
  );
}
