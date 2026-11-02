"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { getHero } from "@/lib/hero/registry";
import {
  detectQualityTier,
  downgradeTier,
  prefersReducedMotion,
  subscribeReducedMotion,
  type QualityTier,
} from "@/lib/hero/performance";
import {
  DEFAULT_OBJECTS,
  resolveSettings,
  type DepthParallaxHeroProps,
  type HeroSettings,
  type LayerId,
} from "./config";
import { Controls } from "./Controls";
import { SceneBoundary } from "./SceneBoundary";
import { supportsWebGL, useHeroInteraction } from "./useHeroInteraction";
import styles from "./depth-parallax.module.css";

// three/R3F는 클라이언트에서 지연 로드 → 첫 페인트에 텍스트·로딩 표시가 먼저 보인다
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const noop = () => () => {};
const subscribeReduced = (cb: () => void) => subscribeReducedMotion(() => cb());
const subscribeMobile = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const getMobile = () => window.matchMedia("(max-width: 767px)").matches;

export default function DepthParallaxHero({
  title,
  description,
  kicker,
  ctaLabel = "장면 속으로 들어가기",
  objects = DEFAULT_OBJECTS,
  initialSettings,
}: DepthParallaxHeroProps = {}) {
  const meta = getHero("depth-parallax");
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<HeroSettings>(() => resolveSettings(initialSettings));
  const [autoTier, setAutoTier] = useState<QualityTier>(() =>
    typeof window === "undefined" ? "medium" : detectQualityTier(),
  );
  const [fps, setFps] = useState<number | null>(null);

  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const systemReduced = useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);
  const mobile = useSyncExternalStore(subscribeMobile, getMobile, () => false);
  const webgl = useSyncExternalStore(noop, supportsWebGL, () => true);

  const reduced = systemReduced || settings.reduceMotion;
  const range = mobile || settings.compactRange ? 0.5 : 1;
  const tier: QualityTier =
    settings.quality === "auto" ? (mobile && autoTier === "high" ? "medium" : autoTier) : settings.quality;

  const it = useHeroInteraction({ rootRef, trackRef, reduced, speed: settings.speed, objects });
  const phase = webgl ? it.phase : "fallback";
  const focused = objects.find((o) => o.id === it.focusedId) ?? null;

  const patch = useCallback((p: Partial<HeroSettings>) => setSettings((s) => ({ ...s, ...p })), []);
  const toggleLayer = useCallback(
    (id: LayerId) => setSettings((s) => ({ ...s, layers: { ...s.layers, [id]: !s.layers[id] } })),
    [],
  );
  const reset = useCallback(() => setSettings(resolveSettings(initialSettings)), [initialSettings]);

  const quality = settings.quality;
  const onFrameStats = useCallback(
    (avgMs: number) => {
      setFps(1000 / avgMs);
      if (quality === "auto") setAutoTier((t) => downgradeTier(t, avgMs, mobile ? 34 : 20));
    },
    [quality, mobile],
  );

  const { markReady, markFallback, focusObject } = it;
  const cssVars = {
    "--hero-accent": settings.accent,
    "--hero-speed": settings.speed,
    "--hero-intensity": settings.intensity,
  } as CSSProperties;

  return (
    <div ref={rootRef} className={styles.root} style={cssVars} onKeyDown={it.handleKeyDown}>
      <section aria-labelledby="hero-title">
        <div ref={trackRef} className={styles.track}>
          <div className={styles.sticky}>
            <div className={styles.text}>
              <span className={styles.kicker}>{kicker ?? `${meta.no} / 10`}</span>
              <h1 id="hero-title" className={styles.title}>
                {title ?? meta.title}
              </h1>
              <p className={styles.desc}>
                {description ?? meta.description}. 마우스를 움직이면 5개 깊이 레이어가 서로 다른 속도로 반응하고,
                스크롤하면 카메라가 장면 안으로 들어갑니다.
              </p>
              <button type="button" className={styles.cta} onClick={() => it.scrollToProgress(1)}>
                {ctaLabel}
              </button>
              <p className={styles.hint}>
                마우스 이동: 시점 · 방향키: 시점 이동 · 스크롤: 장면 진입 · 오브젝트 클릭: 정보 · Esc: 포커스 해제
              </p>
            </div>

            <div className={styles.stageWrap}>
              <div className={styles.stage} aria-hidden="true">
                {mounted && webgl && phase !== "fallback" && (
                  <SceneBoundary onError={markFallback}>
                    <Scene
                      input={it.input}
                      settings={settings}
                      tier={tier}
                      range={range}
                      reduced={reduced}
                      objects={objects}
                      focusedId={it.focusedId}
                      onReady={markReady}
                      onError={markFallback}
                      onSelect={focusObject}
                      onFrameStats={onFrameStats}
                    />
                  </SceneBoundary>
                )}
              </div>

              {phase === "loading" && (
                <div className={styles.overlay} role="status">
                  <div>
                    <span className={styles.loader} />
                    장면을 불러오는 중…
                  </div>
                </div>
              )}
              {phase === "fallback" && (
                <div className={styles.overlay} role="status">
                  <p>
                    이 환경에서는 3D 효과를 표시할 수 없어 정적 이미지로 대체했습니다. 제목과 안내는 그대로
                    사용할 수 있습니다.
                  </p>
                </div>
              )}

              {focused && (
                <aside className={styles.info} aria-label="오브젝트 정보" aria-live="polite">
                  <h2>{focused.title}</h2>
                  <p>{focused.body}</p>
                  <button type="button" onClick={() => focusObject(null)}>
                    닫기 (Esc)
                  </button>
                </aside>
              )}

              {phase !== "fallback" && (
                <Controls
                  settings={settings}
                  onChange={patch}
                  onToggleLayer={toggleLayer}
                  onReset={reset}
                  onNudge={it.nudge}
                  onResetView={it.resetView}
                  onScrollTo={it.scrollToProgress}
                  onFocus={focusObject}
                  objects={objects}
                  focusedId={it.focusedId}
                  progress={it.progress}
                  phase={phase}
                  tier={tier}
                  fps={fps}
                  reduced={reduced}
                  compact={mobile}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
