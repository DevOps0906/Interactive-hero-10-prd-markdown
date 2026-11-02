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
  // Canvas가 다시 만들어져 onCreated가 중복 호출돼도 인트로는 시도(attempt)당 한 번만 시작한다.
  const introStarted = useRef(false);
  const stopIntro = useRef<(() => void) | null>(null);

  const [settings, setSettings] = useState<HeroSettings>({ ...DEFAULT_SETTINGS, ...initialSettings });
  const [stats, setStats] = useState<HeroStats | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [introToken, setIntroToken] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const { state, stateRef, go, settle, pointer, reducedMotion, active } = useHeroInteraction({ rootRef, boxRef });

  const onReady = useCallback(() => {
    if (introStarted.current) return;
    if (go("intro")) {
      introStarted.current = true;
      setIntroToken((t) => t + 1);
    }
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
      const root = rootRef.current;
      // 이전 타임라인이 남아 있으면 먼저 끝내고 제목·CTA를 복원한다.
      stopIntro.current?.();
      stopIntro.current = null;
      const restore = () => {
        // 인라인 opacity/transform을 지워 CSS 기본값(보임)으로 되돌린다.
        root?.querySelectorAll(".hero-text, [data-pu-cta]").forEach((el) => {
          gsap.set(el, { clearProps: "opacity,transform" });
        });
      };
      if (reducedMotion) {
        r.camZ = CAMERA.end;
        r.gather = 1;
        restore();
        go("idle");
        return;
      }
      r.camZ = CAMERA.start;
      r.gather = 0;
      const tl = gsap.timeline({
        onComplete: () => {
          r.camZ = CAMERA.end;
          r.gather = 1;
          restore();
          go("idle");
        },
      });
      tl.to(r, { camZ: CAMERA.end, duration: 2.4, ease: "power2.inOut" }, 0)
        .to(r, { gather: 1, duration: 2.2, ease: "power2.out" }, 0.4)
        // 제목은 숨기지 않는다(프레임이 느려 타임라인이 지연돼도 항상 읽혀야 함). 위치만 살짝 움직인다.
        .fromTo(".hero-text", { y: 20 }, { y: 0, duration: 0.9, ease: "power3.out" }, 1.6)
        .fromTo("[data-pu-cta]", { opacity: 0.5, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 2.5);
      // GSAP는 저프레임에서 시간을 늦추므로(lagSmoothing), 벽시계 기준으로 인트로를 반드시 끝낸다.
      const deadline = window.setTimeout(() => {
        if (tl.isActive()) tl.progress(1);
      }, (tl.duration() + 1) * 1000);
      const stop = () => {
        window.clearTimeout(deadline);
        tl.kill();
        r.camZ = CAMERA.end;
        r.gather = 1;
        restore();
      };
      stopIntro.current = stop;
      return stop;
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
    if (go("loading")) {
      introStarted.current = false;
      setAttempt((a) => a + 1);
    }
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
      <HeroSlot
        hero={hero}
        cta={
          <>
            <button
              type="button"
              data-pu-cta
              aria-disabled={!ctaReady}
              className="btn-primary aria-disabled:opacity-60"
              onClick={() => {
                if (ctaReady) setPanelOpen(true);
              }}
            >
              {ctaLabel}
            </button>
            <p>드래그 회전 · 마우스 이동 반응 · 패널에서 형태 변환</p>
          </>
        }
        panel={
          <div className="relative z-10 flex flex-col gap-3 p-6">
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
          </div>
        }
      >
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

      <p className="sr-only" role="status" aria-live="polite">
        {STATUS_TEXT[state] ?? ""}
      </p>
    </div>
  );
}
