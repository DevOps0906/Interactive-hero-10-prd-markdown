"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import { DPR_MAX_BY_TIER, detectQualityTier, downgradeTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { DEFAULT_SETTINGS, GROUP_NAMES, QUALITY_PRESETS, lowerTier, type Settings } from "./config";
import Controls from "./Controls";
import { ForceSim } from "./forceSim";
import { DEFAULT_GRAPH, type GraphData } from "./graphData";
import { buildModel } from "./graphModel";
import type { SceneStats } from "./Scene";
import { useHeroInteraction } from "./useHeroInteraction";
import styles from "./kg.module.css";

// three/R3F 는 클라이언트에서만 로드한다 (SSR 번들·초기 JS 감소)
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const hero = getHero("knowledge-galaxy");

// WebGL 지원 여부 (한 번만 판정)
let webglCache: boolean | null = null;
function detectWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglCache = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}
const noopSubscribe = () => () => {};
const subscribeMotion = (cb: () => void) => subscribeReducedMotion(() => cb());

class SceneBoundary extends Component<{ onError: (m: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export type KnowledgeGalaxyHeroProps = {
  /** 외부 그래프 데이터 주입 (기본: 내장 샘플) */
  data?: GraphData;
};

export default function KnowledgeGalaxyHero({ data = DEFAULT_GRAPH }: KnowledgeGalaxyHeroProps) {
  const { state, actions } = useHeroInteraction();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [slowTier, setSlowTier] = useState<QualityTier | null>(null);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);
  const webgl = useSyncExternalStore(noopSubscribe, detectWebGL, () => true);
  const detected = useSyncExternalStore(noopSubscribe, detectQualityTier, () => "medium" as QualityTier);
  const tier = slowTier ? lowerTier(detected, slowTier) : detected;
  const preset = QUALITY_PRESETS[tier];

  const model = useMemo(() => buildModel(data, Math.min(settings.nodeCap, preset.maxNodes)), [data, settings.nodeCap, preset.maxNodes]);
  const sim = useMemo(() => new ForceSim(model), [model]);

  const fallback = !webgl || state.phase === "error";

  // 화면 밖이면 렌더 루프 중단
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onSlow = useCallback(
    (avgMs: number) => setSlowTier((prev) => downgradeTier(lowerTier(detected, prev ?? detected), avgMs, 24)),
    [detected],
  );

  const interactive = !fallback && (state.phase === "idle" || state.phase === "interacting" || state.phase === "transitioning");
  const cssVars = {
    "--hero-accent": settings.accent,
    "--hero-speed": settings.speed,
    "--hero-intensity": settings.intensity,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={cssVars}
      onKeyDown={(e) => {
        if (e.key === "Escape") actions.clear();
      }}
    >
      <HeroSlot hero={hero}>
        <div className={styles.stage}>
          {fallback ? (
            <Fallback model={model} message={state.error ?? "이 환경에서는 3D 그래프를 표시할 수 없어 정적 화면으로 대체했습니다."} />
          ) : (
            <>
              <SceneBoundary onError={actions.fail}>
                <Scene
                  model={model}
                  sim={sim}
                  settings={settings}
                  preset={preset}
                  dprMax={DPR_MAX_BY_TIER[tier]}
                  reducedMotion={reducedMotion}
                  active={!settings.paused && inView}
                  state={state}
                  actions={actions}
                  labelRefs={labelRefs}
                  onStats={setStats}
                  onSlow={onSlow}
                />
              </SceneBoundary>
              <div className={styles.labels}>
                {model.ids.map((id, i) => (
                  <span
                    key={id}
                    className={styles.label}
                    ref={(el) => {
                      labelRefs.current[i] = el;
                    }}
                  >
                    {model.data.nodes.find((nd) => nd.id === id)?.label}
                  </span>
                ))}
              </div>
              {state.phase === "loading" && (
                <div className={styles.overlay} data-kind="loading">
                  <span className={styles.spinner} />
                  <span>지식 그래프를 불러오는 중…</span>
                </div>
              )}
            </>
          )}
        </div>
      </HeroSlot>

      <div className={styles.cta}>
        <button type="button" className="btn-primary" disabled={!interactive} onClick={() => actions.select(data.rootId)}>
          중심 노드 탐색하기
        </button>
        <span className={styles.hint}>드래그 회전 · 휠 줌 · 노드 클릭 선택 · Esc 해제</span>
      </div>

      <Controls
        model={model}
        totalNodes={Math.min(data.nodes.length, preset.maxNodes)}
        settings={settings}
        setSettings={setSettings}
        state={state}
        actions={actions}
        stats={stats}
        tier={tier}
        reducedMotion={reducedMotion}
        fallback={fallback}
      />
    </div>
  );
}

function Fallback({ model, message }: { model: ReturnType<typeof buildModel>; message: string }) {
  const topics = model.data.nodes.filter((nd) => model.indexOf.has(nd.id) && nd.id !== model.data.rootId);
  return (
    <div className={styles.overlay} data-kind="fallback">
      <div
        role="presentation"
        className={styles.fallbackImg}
        style={{ width: 400, aspectRatio: "800 / 520", backgroundImage: "url(/heroes/knowledge-galaxy/fallback.svg)", backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
      />
      <p>{message}</p>
      <ul className={styles.fallbackList}>
        {topics.slice(0, 12).map((nd) => (
          <li key={nd.id}>
            {nd.label}
            <small>{GROUP_NAMES[nd.group] ?? nd.group}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
