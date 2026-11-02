import type { QualityTier } from "@/lib/hero/performance";

export type HeroState = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "error";

export interface KineticOptions {
  /** 마키 기본 속도 배율 (--hero-speed) */
  speed: number;
  /** 스크롤·포인터 반응 강도 (--hero-intensity) */
  intensity: number;
  /** variable font wght 축 */
  weight: number;
  /** variable font wdth 축 (축이 없는 폰트에서는 무시됨) */
  width: number;
  /** 포인터 속도 skew 사용 */
  skew: boolean;
  /** Pin/Scrub 확대·전환 사용 */
  pin: boolean;
}

export const DEFAULT_OPTIONS: KineticOptions = {
  speed: 1,
  intensity: 1,
  weight: 700,
  width: 100,
  skew: true,
  pin: true,
};

export const AXIS = {
  weight: { min: 100, max: 900, step: 10 },
  width: { min: 75, max: 125, step: 1 },
} as const;

/** 외부 데이터 주입용 props 계약 (CMS 연결은 범위 밖) */
export interface KineticContent {
  title: string;
  marquee: string[];
  nextLabel: string;
  ctaLabel: string;
  ctaHref: string;
}

export const DEFAULT_CONTENT: KineticContent = {
  title: "KINETIC TYPE",
  marquee: ["Scroll speed", "Variable weight", "Letter stagger", "Pinned scrub"],
  nextLabel: "NEXT SCENE",
  ctaLabel: "조작 패널로 이동",
  ctaHref: "#kt-controls",
};

export interface TierPreset {
  rows: number;
  skewEnabled: boolean;
  maxVelocity: number;
}

export const TIER_PRESETS: Record<QualityTier, TierPreset> = {
  low: { rows: 1, skewEnabled: false, maxVelocity: 1500 },
  medium: { rows: 2, skewEnabled: true, maxVelocity: 2500 },
  high: { rows: 3, skewEnabled: true, maxVelocity: 3500 },
};

export const BASE_MARQUEE_PX_PER_SEC = 60;
export const MAX_SKEW_DEG = 12;
