"use client";

import { useRef, useState, type CSSProperties } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import { Controls } from "./Controls";
import { DEFAULT_CONTENT, DEFAULT_OPTIONS, type KineticContent, type KineticOptions } from "./config";
import { Scene } from "./Scene";
import { useHeroInteraction } from "./useHeroInteraction";

const tokens = {
  "--hero-bg": "var(--color-bg)",
  "--hero-fg": "var(--color-text)",
  "--hero-accent": "var(--color-primary)",
  "--hero-speed": 1,
  "--hero-intensity": 1,
} as CSSProperties;

const STATE_LABEL = {
  loading: "불러오는 중…",
  intro: "등장",
  idle: "대기",
  interacting: "조작 중",
  transitioning: "장면 전환 중",
  error: "효과를 불러오지 못해 정적 화면으로 표시합니다",
} as const;

export default function KineticTypeHero({ content = DEFAULT_CONTENT }: { content?: KineticContent }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const [options, setOptions] = useState<KineticOptions>(DEFAULT_OPTIONS);
  const { state, tier, reduced, copies, replayReveal } = useHeroInteraction(
    { root: rootRef, title: titleRef, next: nextRef },
    options,
  );
  const fallback = reduced || state === "error";

  return (
    <>
      <div ref={rootRef} className="relative" style={tokens} data-state={state} data-tier={tier}>
        <HeroSlot
          hero={getHero("kinetic-type")}
          cta={
            <>
              <a href={content.ctaHref} className="btn-primary inline-flex items-center no-underline">{content.ctaLabel}</a>
              <p role="status" className="m-0 font-mono">
                {STATE_LABEL[state]}{!fallback && state !== "loading" ? ` · ${tier}` : ""}
              </p>
              <p className="m-0 hidden md:block">
                {reduced ? "모션 감소 설정: 정적 화면" : "스크롤하여 장면 전환 · 마우스를 움직여 보세요"}
              </p>
            </>
          }
        >
          <Scene content={content} state={state} tier={tier} reduced={reduced} copies={copies} titleRef={titleRef} nextRef={nextRef} />
        </HeroSlot>
      </div>
      <Controls options={options} onChange={setOptions} onReplay={replayReveal} disabled={fallback} />
    </>
  );
}
