"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import Controls from "./Controls";
import { HERO_TOKENS, type LiquidMorphingProps } from "./config";
import { useHeroInteraction } from "./useHeroInteraction";
import styles from "./LiquidMorphing.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

export default function LiquidMorphingHero({
  ctaLabel = "효과 직접 조작하기",
  ctaHref = "#lm-controls",
  initialSettings,
}: LiquidMorphingProps = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const h = useHeroInteraction(stageRef, initialSettings);
  const webgl = useMemo(() => (h.mounted ? hasWebGL() : true), [h.mounted]);
  const showFallback = h.state === "fallback" || !webgl;

  const vars = {
    "--hero-bg": HERO_TOKENS.bg,
    "--hero-fg": HERO_TOKENS.fg,
    "--hero-accent": h.settings.accent,
    "--hero-speed": h.settings.speed,
    "--hero-intensity": h.settings.intensity,
  } as CSSProperties;

  return (
    <div className={styles.root} style={vars}>
      <HeroSlot
        hero={getHero("liquid-morphing")}
        cta={
          <a className="btn-primary inline-flex items-center no-underline" href={ctaHref}>
            {ctaLabel}
          </a>
        }
        panel={
          <Controls
            settings={h.settings}
            update={h.update}
            state={showFallback ? "fallback" : h.state}
            tier={h.tier}
            reduced={h.reduced}
            stats={h.stats}
            onPreset={h.runPreset}
            onReplayIntro={h.replayIntro}
            onPulse={h.pulse}
          />
        }
      >
        <div ref={stageRef} className={styles.stage}>
          {h.mounted && !showFallback ? (
            <Scene
              key={attempt}
              live={h.live}
              pointer={h.pointer}
              scroll={h.scroll}
              settings={h.settings}
              tier={h.tier}
              reduced={h.reduced}
              tick={h.tick}
              onReady={h.onReady}
              onFps={h.onFps}
              onError={h.onFallback}
            />
          ) : null}
          {showFallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 SVG 대체 이미지 */}
              <img className={styles.fallbackImg} src="/heroes/liquid-morphing/fallback.svg" alt="" />
              <span>이 환경에서는 3D 효과를 표시할 수 없어 대체 이미지를 보여 줍니다.</span>
              {webgl ? (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setAttempt((n) => n + 1);
                    h.retry();
                  }}
                >
                  효과 다시 시도
                </button>
              ) : null}
            </div>
          ) : null}
          {h.state === "loading" && !showFallback ? (
            <div className={styles.loader}>
              <span className={styles.spinner} />
              <span>로딩 중…</span>
            </div>
          ) : null}
        </div>
      </HeroSlot>
    </div>
  );
}
