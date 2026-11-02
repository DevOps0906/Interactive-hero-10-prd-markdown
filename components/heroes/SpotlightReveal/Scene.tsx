import type { Ref } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { QUALITY_PRESETS, type Phase, type SceneContent, type TouchMode } from "./config";
import styles from "./SpotlightReveal.module.css";

function Layer({ content, className }: { content: SceneContent; className: string }) {
  return (
    <div className={`${styles.layer} ${className}`}>
      <p className={styles.eyebrow}>{content.eyebrow}</p>
      <p className={styles.title}>{content.title}</p>
      <p className={styles.body}>{content.body}</p>
      <ul className={styles.chips}>
        {content.chips.map((chip) => (
          <li key={chip} data-spot="link">
            {chip}
          </li>
        ))}
      </ul>
    </div>
  );
}

type SceneProps = {
  stageRef: Ref<HTMLDivElement>;
  base: SceneContent;
  reveal: SceneContent;
  phase: Phase;
  tier: QualityTier;
  touchMode: TouchMode;
  showLayers: boolean;
};

/** DOM Stage: 같은 영역에 기본/리빌 두 레이어를 겹치고 리빌 레이어에 radial mask를 건다. */
export function Scene({ stageRef, base, reveal, phase, tier, touchMode, showLayers }: SceneProps) {
  return (
    <div
      ref={stageRef}
      className={styles.stage}
      data-phase={phase}
      data-tier={tier}
      data-touch={touchMode}
      data-layers={showLayers}
      data-glow={QUALITY_PRESETS[tier].glow}
      data-fallback={phase === "fallback"}
      style={phase === "fallback" ? { backgroundImage: "url(/heroes/spotlight-reveal/still.svg)" } : undefined}
    >
      <Layer content={base} className={styles.base} />
      <Layer content={reveal} className={styles.reveal} />
      <div className={styles.ring} />
    </div>
  );
}
