import type { CSSProperties, RefObject } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { TIER_PRESETS, type HeroState, type KineticContent } from "./config";

const fontStyle: CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontWeight: "var(--kt-wght, 700)" as unknown as number,
  fontVariationSettings: '"wght" var(--kt-wght, 700), "wdth" var(--kt-wdth, 100)',
  fontStretch: "calc(var(--kt-wdth, 100) * 1%)",
};

interface SceneProps {
  content: KineticContent;
  state: HeroState;
  tier: QualityTier;
  reduced: boolean;
  copies: number;
  titleRef: RefObject<HTMLDivElement | null>;
  nextRef: RefObject<HTMLDivElement | null>;
}

/** DOM Stage: 마키 줄 + 대형 제목(글자 분리) + 다음 장면 레이블. 전체가 aria-hidden 스테이지 안에 들어간다. */
export function Scene({ content, state, tier, reduced, copies, titleRef, nextRef }: SceneProps) {
  const rows = reduced || state === "error" ? 1 : TIER_PRESETS[tier].rows;
  const copyCount = reduced || state === "error" ? 1 : copies;
  const hideLetters = state === "loading";

  return (
    <div className="relative size-full overflow-hidden select-none" style={fontStyle}>
      <div className="absolute inset-0 flex flex-col justify-between py-2">
        {[0, 1, 2].map((i) => {
          const items = content.marquee.slice(i % content.marquee.length).concat(content.marquee.slice(0, i % content.marquee.length));
          return (
            <div
              key={i}
              data-kt-row
              data-kt-dir={i % 2 === 0 ? 1 : -1}
              hidden={i >= rows}
              className="overflow-hidden whitespace-nowrap"
            >
              <div data-kt-track className="flex w-max will-change-transform">
                {Array.from({ length: copyCount }, (_, c) => (
                  // 첫 벌만 측정 대상. 나머지는 스크린리더에 반복 노출하지 않는다.
                  <div
                    key={c}
                    {...(c === 0 ? { "data-kt-copy": "" } : { "aria-hidden": true })}
                    className="flex shrink-0 gap-8 pr-8 text-[28px] uppercase tracking-tight text-[var(--hero-accent)] opacity-50 md:text-[44px] xl:text-[64px]"
                  >
                    {items.map((t) => (
                      <span key={t}>{t} —</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 grid place-items-center">
        <div
          ref={titleRef}
          className="text-center text-[44px] leading-[0.95] tracking-tight text-[var(--hero-fg)] will-change-transform md:text-[88px] xl:text-[128px]"
        >
          {content.title.split(" ").map((word, wi) => (
            <span key={wi} className="inline-block whitespace-nowrap px-[0.12em]">
              {Array.from(word).map((ch, ci) => (
                <span key={ci} className="inline-block overflow-hidden align-bottom">
                  <span data-kt-letter className="inline-block" style={hideLetters ? { opacity: 0 } : undefined}>
                    {ch}
                  </span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div
        ref={nextRef}
        className="absolute inset-x-0 bottom-4 text-center text-[12px] tracking-[0.3em] text-[var(--hero-accent)] md:text-[13px]"
        style={{ opacity: 0 }}
      >
        {content.nextLabel}
      </div>
    </div>
  );
}
