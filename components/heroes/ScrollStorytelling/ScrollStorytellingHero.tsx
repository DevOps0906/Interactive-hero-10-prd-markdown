"use client";

import dynamic from "next/dynamic";
import { Component, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
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
  return (
    <div className={s.root}>
      <HeroSlot
        hero={getHero("scroll-storytelling")}
        cta={
          <>
            <a href="#chapter-approach" className={`btn-primary ${s.cta}`}>
              스토리 보기
            </a>
            <p className={s.notice}>{notice}</p>
          </>
        }
        panel={
          <div className={s.static}>
            <p className="sr-only">중앙 코어와 외피 조각으로 이루어진 장치의 정지 이미지</p>
            {CHAPTERS.slice(1).map((c) => (
              <section key={c.id} id={`chapter-${c.id}`}>
                <span className={s.kicker}>{c.kicker}</span>
                <h2>{c.title}</h2>
                <p>{c.body}</p>
              </section>
            ))}
          </div>
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={STILL} alt="" className={s.still} />
      </HeroSlot>
    </div>
  );
}

export default function ScrollStorytellingHero() {
  const rootRef = useRef<HTMLElement>(null);
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_SETTINGS);
  const [autoTier, setAutoTier] = useState<QualityTier>(detectQualityTier);
  const reduced = useSyncExternalStore(
    (cb) => subscribeReducedMotion(cb),
    prefersReducedMotion,
    () => false,
  );
  const [failedFlag, setFailedFlag] = useState(false);
  const enabled = !reduced && !failedFlag;
  // 섹션(HeroSlot scroll 모드)이 곧 스크롤 트랙이다.
  const { progressRef, introRef, status, chapter, goTo, markReady, markFallback } = useHeroInteraction({ rootRef, trackRef: rootRef, settings, enabled });
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
  } as CSSProperties;

  return (
    <div className={s.root} style={style}>
      <HeroSlot
        hero={getHero("scroll-storytelling")}
        kicker={`${getHero("scroll-storytelling").no} / 10 · ${CHAPTERS[0].kicker}`}
        scroll={CHAPTERS.length * (CHAPTER_VH / 100)}
        sectionRef={rootRef}
        cta={
          <button type="button" className={`btn-primary ${s.cta}`} onClick={() => goTo(1)}>
            스토리 시작하기
          </button>
        }
        extra={CHAPTERS.slice(1).map((c) => (
          <div key={c.id} className={s.layer} data-layer id={`chapter-${c.id}`}>
            <span className={s.kicker}>{c.kicker}</span>
            <h2>{c.title}</h2>
            <p>{c.body}</p>
          </div>
        ))}
        overlay={
          <>
            {status === "loading" && (
              <div className={s.loading} role="status">
                <div>
                  <div className={s.spinner} />
                  장면을 불러오는 중…
                </div>
              </div>
            )}
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
          </>
        }
      >
        <div className={s.canvas}>
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
      </HeroSlot>
    </div>
  );
}
