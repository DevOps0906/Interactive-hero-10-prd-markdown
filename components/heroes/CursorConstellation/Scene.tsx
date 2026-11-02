"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { clampDpr, detectQualityTier, downgradeTier, DPR_MAX_BY_TIER, type QualityTier } from "@/lib/hero/performance";
import type { HeroSettings, Phase, SceneCommands, Stats } from "./config";
import { ConstellationEngine } from "./engine";
import { useHeroInteraction } from "./useHeroInteraction";

interface SceneProps {
  settings: HeroSettings;
  brandText: string;
  reduced: boolean;
  phase: Phase;
  commandsRef: MutableRefObject<SceneCommands | null>;
  onPhase: (p: Phase) => void;
  onStats: (s: Stats) => void;
}

/** 캔버스 Stage. 부모(.hero-stage, aria-hidden)의 전체 영역을 채운다. */
export default function Scene({ settings, brandText, reduced, phase, commandsRef, onPhase, onStats }: SceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ConstellationEngine | null>(null);
  const settingsRef = useRef(settings);
  const brandRef = useRef(brandText);
  const cbRef = useRef({ onPhase, onStats });
  const { pointer, clicks } = useHeroInteraction(wrapRef);

  useEffect(() => {
    settingsRef.current = settings;
    brandRef.current = brandText;
    cbRef.current = { onPhase, onStats };
    engineRef.current?.refresh();
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cbRef.current.onPhase("error");
      return;
    }

    let raf = 0;
    let disposed = false;
    let visible = !document.hidden;
    let inView = true;
    let last = 0;
    let frames = 0;
    let accMs = 0;
    let fpsFrames = 0;
    let fpsAcc = 0;
    let tier: QualityTier = detectQualityTier();
    if (wrap.clientWidth < 768 && tier === "high") tier = "medium";

    const engine = new ConstellationEngine({
      ctx,
      colorSource: wrap,
      getSettings: () => settingsRef.current,
      getBrandText: () => brandRef.current,
      onPhase: (p) => cbRef.current.onPhase(p),
      reduced,
    });
    engine.setTier(tier);
    engineRef.current = engine;

    const fail = () => {
      cancelAnimationFrame(raf);
      engine.fail();
    };
    const applySize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      engine.resize(w, h, clampDpr(DPR_MAX_BY_TIER[tier]));
    };

    const emitStats = (fps: number) =>
      cbRef.current.onStats({
        fps,
        particles: engine.particleCount,
        edges: engine.stats.edges,
        pairChecks: engine.stats.pairChecks,
        tier,
        dpr: engine.currentDpr,
      });

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!last) {
        last = now;
        return;
      }
      const ms = now - last;
      last = now;
      try {
        for (const c of clicks.current.splice(0)) engine.burst(c.x, c.y);
        engine.step(Math.min(ms / 1000, 1 / 30), pointer.current);
        engine.draw();
      } catch {
        fail();
        return;
      }
      // 성능 자동 조절: 90프레임 평균이 예산을 넘으면 등급을 한 단계 낮춘다.
      frames++;
      if (frames > 30) {
        accMs += ms;
        if ((frames - 30) % 90 === 0) {
          const next = downgradeTier(tier, accMs / 90, 22);
          accMs = 0;
          if (next !== tier) {
            tier = next;
            engine.setTier(tier);
            applySize();
          }
        }
      }
      fpsFrames++;
      fpsAcc += ms;
      if (fpsAcc >= 500) {
        emitStats(Math.round((fpsFrames * 1000) / fpsAcc));
        fpsFrames = 0;
        fpsAcc = 0;
      }
    };

    const syncLoop = () => {
      if (reduced || disposed) return;
      const run = visible && inView;
      if (run && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    try {
      applySize();
      engine.startIntro();
      if (reduced) emitStats(0);
    } catch {
      fail();
      return;
    }

    const ro = new ResizeObserver(() => {
      try {
        applySize();
      } catch {
        fail();
      }
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      syncLoop();
    });
    io.observe(wrap);
    const onVis = () => {
      visible = !document.hidden;
      syncLoop();
    };
    document.addEventListener("visibilitychange", onVis);
    syncLoop();

    commandsRef.current = {
      burst: () => engine.burstCenter(),
      toggleLogo: () => engine.toggleLogo(),
      reset: () => engine.reset(),
    };

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      engine.dispose();
      engineRef.current = null;
      commandsRef.current = null;
    };
  }, [reduced, commandsRef, pointer, clicks]);

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{
        touchAction: "pan-y",
        ["--hero-accent" as string]: "var(--color-primary)",
        ["--hero-fg" as string]: "var(--color-text)",
        ["--hero-speed" as string]: settings.speed,
        ["--hero-intensity" as string]: settings.intensity,
      }}
    >
      {phase === "error" ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/heroes/cursor-constellation/fallback.svg)" }}
        />
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      )}
      {phase === "loading" && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="size-3 animate-pulse rounded-full bg-[var(--color-primary)]" />
        </div>
      )}
    </div>
  );
}
