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
        <HeroSlot hero={getHero("kinetic-type")}>
          <Scene content={content} state={state} tier={tier} reduced={reduced} copies={copies} titleRef={titleRef} nextRef={nextRef} />
        </HeroSlot>
        <p role="status" className="pointer-events-none absolute left-8 top-8 z-10 m-0 rounded-[var(--radius-control)] bg-[var(--color-surface)] px-2 py-1 font-mono text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          {STATE_LABEL[state]}{!fallback && state !== "loading" ? ` · ${tier}` : ""}
        </p>
        <div className="absolute bottom-6 right-6 z-10 max-md:bottom-auto max-md:top-8">
          <a href={content.ctaHref} className="btn-primary inline-flex items-center no-underline">{content.ctaLabel}</a>
        </div>
        <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 m-0 hidden -translate-x-1/2 text-[length:var(--text-caption)] text-[var(--color-text-muted)] md:block">
          {reduced ? "모션 감소 설정: 정적 화면" : "스크롤하여 장면 전환 · 마우스를 움직여 보세요"}
        </p>
      </div>
      <Controls options={options} onChange={setOptions} onReplay={replayReveal} disabled={fallback} />
    </>
  );
}
