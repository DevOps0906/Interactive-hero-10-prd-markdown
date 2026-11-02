import type { QualityTier } from "@/lib/hero/performance";

export type HeroState = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";

export type FeatureKey = "magnet" | "stagger" | "spring" | "variable" | "button" | "skew" | "touch";

export type HeroOptions = {
  /** 영향 반경(px) */
  radius: number;
  /** 0~1 자기장 세기 (--hero-intensity) */
  intensity: number;
  /** 애니메이션 속도 배율 (--hero-speed) */
  speed: number;
  /** skew 상한(deg) */
  maxSkew: number;
  features: Record<FeatureKey, boolean>;
};

export const DEFAULT_OPTIONS: HeroOptions = {
  radius: 220,
  intensity: 0.6,
  speed: 1,
  maxSkew: 14,
  features: { magnet: true, stagger: true, spring: true, variable: true, button: true, skew: true, touch: true },
};

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  magnet: "1 거리 기반 자기장",
  stagger: "2 문자 stagger reveal",
  spring: "3 탄성 복귀",
  variable: "4 가변 폰트 weight/width",
  button: "5 버튼 cursor-follow",
  skew: "6 velocity skew",
  touch: "7 터치 탭 반응",
};

export type TierPreset = { variable: boolean; radiusScale: number; maxFps: number };

export const TIER_PRESETS: Record<QualityTier, TierPreset> = {
  low: { variable: false, radiusScale: 0.7, maxFps: 30 },
  medium: { variable: true, radiusScale: 0.85, maxFps: 60 },
  high: { variable: true, radiusScale: 1, maxFps: 60 },
};

export const TITLE_LINES = ["MAGNETIC", "TYPO", "GRAPHY"] as const;
export const WGHT_RANGE = [200, 900] as const;
export const WDTH_RANGE = [100, 125] as const;
