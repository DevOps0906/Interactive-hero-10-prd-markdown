import type { QualityTier } from "@/lib/hero/performance";

export type HeroState = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";
export type Mode = "blob" | "metaball";
export type QualitySetting = "auto" | QualityTier;

/** 사용자 조절 옵션(React state). 외부 데이터 주입은 initialSettings props로. */
export type Settings = {
  mode: Mode;
  speed: number; // --hero-speed
  intensity: number; // --hero-intensity
  iridescence: number; // 0~1 (인터랙션 4)
  pointerOn: boolean; // 인터랙션 3
  scrollLink: boolean; // 인터랙션 5
  scrollManual: boolean;
  scrollValue: number; // 0~1 수동 진행도
  accent: string; // --hero-accent
  quality: QualitySetting;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "blob",
  speed: 1,
  intensity: 1,
  iridescence: 0.7,
  pointerOn: true,
  scrollLink: true,
  scrollManual: false,
  scrollValue: 0,
  accent: "#5ee1ff",
  quality: "auto",
};

export const HERO_TOKENS = { bg: "#080B12", fg: "#EEF1F7", secondary: "#8a6bff" } as const;

/** GSAP이 트윈하는 값(인터랙션 6). 렌더 루프가 매 프레임 읽는다. */
export type LiveValues = { noise: number; intensity: number; scale: number; camZ: number; colorMix: number };

export const BASE_LIVE: LiveValues = { noise: 0.35, intensity: 1, scale: 1, camZ: 4, colorMix: 0 };
export const INTRO_FROM: LiveValues = { noise: 0, intensity: 0, scale: 0.2, camZ: 6.5, colorMix: 1 };

export type PresetId = "calm" | "liquid" | "storm";
export const PRESETS: readonly { id: PresetId; label: string; values: LiveValues }[] = [
  { id: "calm", label: "잔잔함", values: { noise: 0.15, intensity: 0.7, scale: 1, camZ: 4.4, colorMix: 0 } },
  { id: "liquid", label: "액체", values: { ...BASE_LIVE } },
  { id: "storm", label: "폭풍", values: { noise: 0.7, intensity: 1.5, scale: 1.1, camZ: 3.4, colorMix: 1 } },
];

/** 포인터(스테이지 기준 NDC -1~1). press는 클릭/드래그 강도 0~1. */
export type PointerState = { x: number; y: number; active: boolean; press: number };

export type TierPreset = {
  detail: number; // IcosahedronGeometry detail (정점 수)
  dprMax: number;
  steps: number; // raymarch 반복 수
  balls: number; // 메타볼 개수
};

export const TIER_PRESETS: Record<QualityTier, TierPreset> = {
  low: { detail: 16, dprMax: 1, steps: 24, balls: 3 },
  medium: { detail: 32, dprMax: 1.5, steps: 40, balls: 4 },
  high: { detail: 48, dprMax: 2, steps: 64, balls: 5 },
};

export type LiquidMorphingProps = {
  ctaLabel?: string;
  ctaHref?: string;
  initialSettings?: Partial<Settings>;
};
