import type { QualityTier } from "@/lib/hero/performance";

export type ShapeId = "sphere" | "spiral" | "mark";
export type FieldMode = "repel" | "attract";
export type QualitySetting = "auto" | QualityTier;
export type HeroState = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "error";

export interface HeroSettings {
  shape: ShapeId;
  field: FieldMode;
  autoRotate: boolean;
  /** --hero-speed: 시간·자동회전 배율 (0~2) */
  speed: number;
  /** --hero-intensity: 변위·반응 강도 배율 (0~2) */
  intensity: number;
  /** --hero-accent */
  accent: string;
  quality: QualitySetting;
}

/** 외부 데이터 주입 계약: 모든 값은 선택. 지정하지 않으면 기본값. */
export interface ParticleUniverseHeroProps {
  initialSettings?: Partial<HeroSettings>;
  ctaLabel?: string;
}

export interface HeroStats {
  fps: number;
  count: number;
  dpr: number;
  tier: QualityTier;
}

/** 부모(GSAP 타임라인)가 쓰고 Scene이 프레임마다 읽는 인트로 값. React state가 아니다. */
export interface IntroRig {
  camZ: number;
  gather: number;
}

export interface SceneCommands {
  nudge: (direction: -1 | 1) => void;
}

export interface PointerInput {
  /** 스테이지 기준 NDC (-1~1) */
  x: number;
  y: number;
  inside: boolean;
  down: boolean;
}

export const DEFAULT_SETTINGS: HeroSettings = {
  shape: "sphere",
  field: "repel",
  autoRotate: true,
  speed: 1,
  intensity: 1,
  accent: "#3fd0bd",
  quality: "auto",
};

export const SHAPES: readonly { id: ShapeId; label: string }[] = [
  { id: "sphere", label: "구" },
  { id: "spiral", label: "나선" },
  { id: "mark", label: "브랜드 마크" },
];

export const ACCENTS: readonly { value: string; label: string }[] = [
  { value: "#3fd0bd", label: "민트" },
  { value: "#8b7cff", label: "바이올렛" },
  { value: "#ffb454", label: "앰버" },
];

export const QUALITY_PRESETS: Record<QualityTier, { count: number; pointSize: number }> = {
  low: { count: 8000, pointSize: 2.6 },
  medium: { count: 24000, pointSize: 2.0 },
  high: { count: 60000, pointSize: 1.6 },
};

/** 히어로 로컬 토큰 기본값 (--hero-bg 등). 래퍼 style로 주입한다. */
export const HERO_TOKENS = { bg: "#080B12", fg: "#EEF0F3", muted: "#A3ABB8" } as const;

export const CAMERA = { start: 14, end: 8, fov: 50 } as const;
export const SPHERE_RADIUS = 2.6;
