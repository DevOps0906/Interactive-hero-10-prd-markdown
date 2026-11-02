"use client";

import dynamic from "next/dynamic";
import { Component, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { getHero } from "@/lib/hero/registry";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { CHAPTERS, CHAPTER_VH, DEFAULT_SETTINGS, type HeroSettings } from "./config";
import { Controls } from "./Controls";
import { useHeroInteraction } from "./useHeroInteraction";
import s from "./ScrollStorytelling.module.css";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const STILL = "/heroes/scroll-storytelling/still.svg";

// 효과 미지원·reduced-motion: 핵심 내용을 모두 읽을 수 있는 정적 페이지
function StaticStory({ notice }: { notice: string }) {
  const hero = getHero("scroll-storytelling");
  return (
    <section className={`${s.root} ${s.static}`} aria-labelledby="hero-title">
      <div>
        <span className={s.kicker}>{hero.no} / 10</span>
        <h1 id="hero-title">{CHAPTERS[0].title}</h1>
        <p>{CHAPTERS[0].body}</p>
        <a href="#chapter-approach" className={`btn-primary ${s.cta}`}>
          스토리 보기
        </a>
        <p className={s.notice}>{notice}</p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={STILL} alt="중앙 코어와 외피 조각으로 이루어진 장치의 정지 이미지" />
      {CHAPTERS.slice(1).map((c) => (
        <section key={c.id} id={`chapter-${c.id}`}>
          <span className={s.kicker}>{c.kicker}</span>
          <h2>{c.title}</h2>
          <p>{c.body}</p>
        </section>
      ))}
    </section>
  );
}

export default function ScrollStorytellingHero() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  const [autoTier, setAutoTier] = useState<QualityTier>(detectQualityTier);
  const reduced = useSyncExternalStore(
    (cb) => subscribeReducedMotion(cb),
    prefersReducedMotion,
    () => false,
  );
  const [failedFlag, setFailedFlag] = useState(false);
  const enabled = !reduced && !failedFlag;
  const { progressRef, introRef, status, chapter, goTo, markReady, markFallback } = useHeroInteraction({ rootRef, trackRef, settings, enabled });
  const tier: QualityTier = settings.tier === "auto" ? autoTier : settings.tier;

  const fail = () => {
    setFailedFlag(true);
    markFallback();
  };

  if (reduced) return <StaticStory notice="모션 감소 설정이 켜져 있어 정적 페이지로 표시합니다." />;
  if (failedFlag) return <StaticStory notice="3D를 표시할 수 없어 정적 페이지로 표시합니다." />;

  const style = {
    "--hero-accent": settings.accent,
    "--hero-speed": settings.speed,
    "--hero-intensity": settings.intensity,
    "--chapters": CHAPTERS.length * (CHAPTER_VH / 100),
  } as CSSProperties;

  return (
    <section ref={rootRef} className={s.root} style={style} aria-labelledby="hero-title">
      <div ref={trackRef} className={s.track}>
        <div className={s.stage} data-stage>
          <div className={s.canvas} aria-hidden="true">
            <SceneBoundary onError={fail}>
              <Scene
                progressRef={progressRef}
                introRef={introRef}
                settings={settings}
                tier={tier}
                onReady={markReady}
                onError={fail}
                onSlow={(t) => setAutoTier(t)}
              />
            </SceneBoundary>
          </div>
          {status === "loading" && (
            <div className={s.loading} role="status">
              <div>
                <div className={s.spinner} />
                장면을 불러오는 중…
              </div>
            </div>
          )}
          <div className={s.text}>
            <div className={s.layers}>
              {CHAPTERS.map((c, i) => (
                <div key={c.id} className={s.layer} data-layer id={`chapter-${c.id}`}>
                  <span className={s.kicker}>{i === 0 ? `${getHero("scroll-storytelling").no} / 10 · ${c.kicker}` : c.kicker}</span>
                  {i === 0 ? <h1 id="hero-title">{c.title}</h1> : <h2>{c.title}</h2>}
                  <p>{c.body}</p>
                  {i === 0 && (
                    <div data-cta>
                      <button type="button" className={`btn-primary ${s.cta}`} onClick={() => goTo(1)}>
                        스토리 시작하기
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <nav aria-label="챕터 내비게이션">
            <ol className={s.dots}>
              {CHAPTERS.map((c, i) => (
                <li key={c.id}>
                  <button type="button" className={s.dot} aria-label={`챕터 ${i + 1}: ${c.title}`} aria-current={chapter === i ? "step" : undefined} onClick={() => goTo(i)}>
                    <i />
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <p className={s.hint}>스크롤 · ←/→ 키로 챕터 이동</p>
          <Controls settings={settings} onChange={setSettings} status={status} chapter={chapter} tier={tier} onGoTo={goTo} />
        </div>
      </div>
    </section>
  );
}
