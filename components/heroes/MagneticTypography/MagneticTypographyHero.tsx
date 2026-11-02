"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/hero/performance";
import { Controls } from "./Controls";
import { Scene } from "./Scene";
import { DEFAULT_OPTIONS, type HeroOptions } from "./config";
import { useHeroInteraction } from "./useHeroInteraction";

const subscribeMotion = (cb: () => void) => subscribeReducedMotion(cb);

type Props = { ctaLabel?: string };

export default function MagneticTypographyHero({ ctaLabel = "효과 설정 열기" }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [options, setOptions] = useState<HeroOptions>(DEFAULT_OPTIONS);
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

  const { state, axis, tier, fps, replayIntro, simulateTap } = useHeroInteraction({
    stageRef,
    buttonRef,
    labelRef,
    options,
    reducedMotion,
  });

  return (
    <>
      <HeroSlot hero={getHero("magnetic-typography")}>
        <Scene stageRef={stageRef} state={state} />
      </HeroSlot>
      <div className="flex flex-col items-center gap-6 px-4 py-8 md:px-6" id="mt-controls">
        <button
          ref={buttonRef}
          type="button"
          className="btn-primary"
          onClick={() => document.getElementById("mt-controls")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}
        >
          <span ref={labelRef} className="inline-block">
            {ctaLabel}
          </span>
        </button>
        <Controls
          options={options}
          onChange={setOptions}
          onReset={() => setOptions(DEFAULT_OPTIONS)}
          onReplay={replayIntro}
          onTap={simulateTap}
          state={state}
          tier={tier}
          fps={fps}
          axis={axis}
          reducedMotion={reducedMotion}
        />
      </div>
    </>
  );
}
