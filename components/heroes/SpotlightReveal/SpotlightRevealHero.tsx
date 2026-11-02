"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import { Controls } from "./Controls";
import { Scene } from "./Scene";
import { BRAND, DEFAULT_OPTIONS, DEFAULT_SCENES, PHASE_LABEL, type SceneContent, type SpotlightOptions } from "./config";
import { useHeroInteraction } from "./useHeroInteraction";
import styles from "./SpotlightReveal.module.css";

type Props = {
  /** 외부 데이터 주입용 계약: [기본 장면, 숨은 장면] */
  scenes?: readonly [SceneContent, SceneContent];
  ctaLabel?: string;
  options?: Partial<SpotlightOptions>;
};

export default function SpotlightRevealHero({ scenes = DEFAULT_SCENES, ctaLabel = "숨은 장면 열기", options: initial }: Props) {
  const [options, setOptions] = useState<SpotlightOptions>({ ...DEFAULT_OPTIONS, ...initial });
  const { stageRef, phase, swapped, tier, reducedMotion, seen, expand, reset, onKeyDown, ctaHover, padFocus } =
    useHeroInteraction(options);

  const base = scenes[swapped ? 1 : 0];
  const reveal = scenes[swapped ? 0 : 1];
  const busy = phase === "transitioning" || phase === "loading";

  const rootStyle = {
    "--hero-bg": BRAND.bg,
    "--hero-fg": BRAND.fg,
    "--hero-accent": options.accent,
    "--hero-speed": options.speed,
    "--hero-intensity": options.intensity,
  } as CSSProperties;

  return (
    <div className={styles.root} style={rootStyle}>
      <HeroSlot hero={getHero("spotlight-reveal")}>
        <Scene
          stageRef={stageRef}
          base={base}
          reveal={reveal}
          phase={phase}
          tier={tier}
          touchMode={options.touchMode}
          showLayers={options.showLayers}
        />
      </HeroSlot>

      {/* Stage는 aria-hidden이므로 마스크 뒤 내용을 텍스트로 동등 제공 */}
      <div className={styles.sr}>
        <h2>두 장면의 내용</h2>
        {scenes.map((sc) => (
          <section key={sc.title}>
            <h3>{sc.title}</h3>
            <p>{sc.body}</p>
            <p>{sc.chips.join(", ")}</p>
          </section>
        ))}
      </div>

      <div
        className={styles.pad}
        tabIndex={0}
        role="group"
        aria-label="스포트라이트 키보드 조작: 방향키로 이동, 더하기·빼기로 크기, Enter로 고정"
        onKeyDown={onKeyDown}
        onFocus={() => padFocus(true)}
        onBlur={() => padFocus(false)}
      />

      <div className={styles.bar}>
        <button
          type="button"
          className={`btn-primary ${styles.cta}`}
          disabled={busy}
          onClick={expand}
          onPointerEnter={() => ctaHover(true)}
          onPointerLeave={() => ctaHover(false)}
          onFocus={() => ctaHover(true)}
          onBlur={() => ctaHover(false)}
        >
          {ctaLabel}
        </button>
        <span className={styles.status} role="status">
          {PHASE_LABEL[phase]}
          <span className={styles.sr}> · 현재 장면: {base.title}</span>
        </span>
        <p className={styles.hint}>
          마우스 이동 · 터치 드래그 · Tab 후 방향키 · <a href="#sr-controls">설정 ↓</a>
        </p>
      </div>

      <Controls
        options={options}
        onChange={(patch) => setOptions((o) => ({ ...o, ...patch }))}
        seen={seen}
        tierLabel={tier}
        reducedMotion={reducedMotion}
        onExpand={expand}
        onReset={reset}
      />
    </div>
  );
}
