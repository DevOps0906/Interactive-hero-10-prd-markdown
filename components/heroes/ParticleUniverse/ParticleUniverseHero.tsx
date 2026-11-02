"use client";

import { Component, useCallback, useRef, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import { Controls } from "./Controls";
import {
  CAMERA,
  DEFAULT_SETTINGS,
  HERO_TOKENS,
  type HeroSettings,
  type HeroStats,
  type IntroRig,
  type ParticleUniverseHeroProps,
  type SceneCommands,
} from "./config";
import { useHeroInteraction } from "./useHeroInteraction";

// WebGL 코드는 클라이언트에서만 로드한다 (SSR 시 로딩 표시와 H1·CTA는 즉시 보임).
const Scene = dynamic(() => import("./Scene"), { ssr: false });

interface BoundaryProps {
  children: ReactNode;
  onError: (error: Error) => void;
}

class StageBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const STATUS_TEXT: Record<string, string> = {
  loading: "입자 우주를 불러오는 중입니다.",
  intro: "입자가 구 형태로 모이는 중입니다.",
  error: "WebGL을 사용할 수 없어 정지 이미지로 표시합니다.",
};

export default function ParticleUniverseHero({
  initialSettings,
  ctaLabel = "데모 조작해 보기",
}: ParticleUniverseHeroProps) {
  const hero = getHero("particle-universe");
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const commandsRef = useRef<SceneCommands | null>(null);
  const rig = useRef<IntroRig>({ camZ: CAMERA.start, gather: 0 });

  const [settings, setSettings] = useState<HeroSettings>({ ...DEFAULT_SETTINGS, ...initialSettings });
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [introToken, setIntroToken] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const { state, stateRef, go, settle, pointer, reducedMotion, active } = useHeroInteraction({ rootRef, boxRef });

  const onReady = useCallback(() => {
    if (go("intro")) setIntroToken((t) => t + 1);
  }, [go]);
  const onError = useCallback(() => {
    go("error");
  }, [go]);
  const onMorphDone = useCallback(() => {
    if (stateRef.current === "transitioning") settle();
  }, [stateRef, settle]);

  // GSAP 타임라인: 카메라 진입 → 입자 집결 → 타이틀 등장 → CTA 활성화(state가 idle이 되면 활성)
  useGSAP(
    () => {
      if (introToken === 0) return;
      const r = rig.current;
      if (reducedMotion) {
        r.camZ = CAMERA.end;
        r.gather = 1;
        go("idle");
        return;
      }
      r.camZ = CAMERA.start;
      r.gather = 0;
      const tl = gsap.timeline({
        onComplete: () => {
          go("idle");
        },
      });
      tl.to(r, { camZ: CAMERA.end, duration: 2.4, ease: "power2.inOut" }, 0)
        .to(r, { gather: 1, duration: 2.2, ease: "power2.out" }, 0.4)
        .fromTo(".hero-text", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, 1.6)
        .fromTo("[data-pu-cta]", { opacity: 0.5, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 2.5);
    },
    { scope: rootRef, dependencies: [introToken, reducedMotion] },
  );

  const update = useCallback(
    <K extends keyof HeroSettings>(key: K, value: HeroSettings[K]) => {
      if (key === "shape" && value === settings.shape) return;
      setSettings((s) => ({ ...s, [key]: value }));
      if (key === "shape") go("transitioning");
    },
    [go, settings.shape],
  );

  const replay = useCallback(() => {
    if (go("intro")) setIntroToken((t) => t + 1);
  }, [go]);

  const retry = useCallback(() => {
    if (go("loading")) setAttempt((a) => a + 1);
  }, [go]);

  const ctaReady = state !== "loading" && state !== "intro";
  const failed = state === "error";

  const tokens = {
    "--hero-bg": HERO_TOKENS.bg,
    "--hero-fg": HERO_TOKENS.fg,
    "--hero-accent": settings.accent,
    "--hero-speed": settings.speed,
    "--hero-intensity": settings.intensity,
    // 셸 토큰을 히어로 안에서만 다크 톤으로 덮어쓴다 (라이트 테마에서도 대비 유지)
    "--color-bg": "var(--hero-bg)",
    "--color-text": "var(--hero-fg)",
    "--color-text-muted": HERO_TOKENS.muted,
    "--color-primary": "var(--hero-accent)",
    "--color-primary-fg": HERO_TOKENS.bg,
    "--color-primary-soft": "color-mix(in srgb, var(--hero-accent) 18%, var(--hero-bg))",
    "--color-surface": "#11161f",
    "--color-surface-hover": "#1b2230",
    "--color-border": "#2a3342",
    "--color-input": "#7b8594",
    "--color-danger": "#ef6b6b",
    color: "var(--hero-fg)",
  } as CSSProperties;

  return (
    <div ref={rootRef} className="relative" style={tokens} data-state={state}>
      <HeroSlot hero={hero}>
        <div ref={boxRef} className="relative h-full w-full">
          {failed ? (
            <>
              <Image src="/heroes/particle-universe/fallback.svg" alt="" fill unoptimized className="object-contain" />
              <span className="absolute bottom-2 left-0 right-0 text-center text-caption">정지 이미지로 대체됨</span>
            </>
          ) : (
            <StageBoundary key={attempt} onError={onError}>
              <Scene
                settings={settings}
                reducedMotion={reducedMotion}
                active={active}
                state={state}
                stateRef={stateRef}
                pointerRef={pointer}
                rig={rig}
                commandsRef={commandsRef}
                onReady={onReady}
                onError={onError}
                onMorphDone={onMorphDone}
                onStats={setStats}
              />
            </StageBoundary>
          )}
          {state === "loading" && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="animate-pulse text-caption tracking-wide">입자 우주 불러오는 중…</span>
            </div>
          )}
        </div>
      </HeroSlot>

      <div className="relative z-10 flex flex-col gap-3 p-6 lg:absolute lg:right-0 lg:bottom-0 lg:w-[22rem] lg:items-end">
        <button
          type="button"
          data-pu-cta
          aria-disabled={!ctaReady}
          className="btn-primary self-start lg:self-end aria-disabled:opacity-60"
          onClick={() => {
            if (ctaReady) setPanelOpen(true);
          }}
        >
          {ctaLabel}
        </button>
        <Controls
          open={panelOpen}
          onOpenChange={setPanelOpen}
          settings={settings}
          onChange={update}
          state={state}
          stats={stats}
          reducedMotion={reducedMotion}
          onNudge={(d) => commandsRef.current?.nudge(d)}
          onReplay={replay}
          onRetry={retry}
        />
        <p className="text-caption text-text-muted lg:text-right">드래그 회전 · 마우스 이동 반응 · 패널에서 형태 변환</p>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {STATUS_TEXT[state] ?? ""}
      </p>
    </div>
  );
}
