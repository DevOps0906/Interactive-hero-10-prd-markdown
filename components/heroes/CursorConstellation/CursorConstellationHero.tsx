"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { prefersReducedMotion, subscribeReducedMotion } from "@/lib/hero/performance";
import { getHero } from "@/lib/hero/registry";
import Controls from "./Controls";
import Scene from "./Scene";
import {
  DEFAULT_SETTINGS,
  type CursorConstellationHeroProps,
  type HeroSettings,
  type Phase,
  type SceneCommands,
  type Stats,
} from "./config";

const subscribe = (cb: () => void) => subscribeReducedMotion(cb);
const getServer = () => false;

export default function CursorConstellationHero({
  brandText = "CC",
  ctaHref = "#cc-controls",
  ctaLabel = "데모 조작 열기",
  initialSettings,
}: CursorConstellationHeroProps) {
  const [settings, setSettings] = useState<HeroSettings>({ ...DEFAULT_SETTINGS, ...initialSettings });
  const [phase, setPhase] = useState<Phase>("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const commandsRef = useRef<SceneCommands | null>(null);
  const reduced = useSyncExternalStore(subscribe, prefersReducedMotion, getServer);

  const onChange = useCallback((patch: Partial<HeroSettings>) => setSettings((s) => ({ ...s, ...patch })), []);

  return (
    <>
      <div className="relative [&_.hero]:pb-24">
        <HeroSlot hero={getHero("cursor-constellation")}>
          <Scene
            settings={settings}
            brandText={brandText}
            reduced={reduced}
            phase={phase}
            commandsRef={commandsRef}
            onPhase={setPhase}
            onStats={setStats}
          />
        </HeroSlot>
        <a href={ctaHref} className="btn-primary absolute bottom-6 left-6 inline-flex items-center">
          {ctaLabel}
        </a>
      </div>
      <Controls
        settings={settings}
        onChange={onChange}
        phase={phase}
        stats={stats}
        reduced={reduced}
        commandsRef={commandsRef}
      />
    </>
  );
}
