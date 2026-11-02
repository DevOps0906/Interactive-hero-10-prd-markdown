import type { QualityTier } from "@/lib/hero/performance";

// ---- 설정(디자인 토큰 --hero-speed / --hero-intensity 와 대응) ----
export type QualityMode = "auto" | QualityTier;
export type LayerId = "backdrop" | "far" | "mid" | "near" | "foreground";

export interface HeroSettings {
  /** 보간·인트로 속도 배율 (0.4~2) */
  speed: number;
  /** 포인터 카메라 이동·회전 강도 (0~2) */
  intensity: number;
  /** 레이어별 깊이 변위 배율 (0~2) */
  displacement: number;
  fog: boolean;
  light: boolean;
  accent: string;
  /** 사용자 수동 모션 감소 (시스템 prefers-reduced-motion 과 OR) */
  reduceMotion: boolean;
  /** 모바일 카메라 범위(축소) 강제 */
  compactRange: boolean;
  quality: QualityMode;
  layers: Record<LayerId, boolean>;
}

export const DEFAULT_SETTINGS: HeroSettings = {
  speed: 1,
  intensity: 1,
  displacement: 1,
  fog: true,
  light: true,
  accent: "#3FD0BD",
  reduceMotion: false,
  compactRange: false,
  quality: "auto",
  layers: { backdrop: true, far: true, mid: true, near: true, foreground: true },
};

export const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: "민트", value: "#3FD0BD" },
  { label: "바이올렛", value: "#9B8CFF" },
  { label: "앰버", value: "#F0B35A" },
];

export const HERO_COLORS = { bg: "#080B12", fg: "#EEF0F3", muted: "#A4ACB8" } as const;

// ---- 레이어(z-depth) 정의: 전경·근경·중경·원경·배경 5층 ----
export interface LayerDef {
  id: LayerId;
  name: string;
  z: number;
  /** 포인터 변위 배율: 가까울수록 크다 */
  parallax: number;
  color: string;
}

export const LAYERS: LayerDef[] = [
  { id: "backdrop", name: "배경 (별·달)", z: -44, parallax: 0.1, color: "#080B12" },
  { id: "far", name: "원경 능선", z: -28, parallax: 0.3, color: "#13203a" },
  { id: "mid", name: "중경 능선", z: -16, parallax: 0.6, color: "#0e182c" },
  { id: "near", name: "근경 능선", z: -6, parallax: 1.0, color: "#0a111f" },
  { id: "foreground", name: "전경 오브젝트", z: 2, parallax: 1.5, color: "#3FD0BD" },
];

// ---- 카메라 상수 ----
export const CAMERA = { baseZ: 14, dollyDistance: 22, fov: 50 } as const;

// ---- 성능 프리셋 ----
export interface QualityPreset {
  stars: number;
  dprMax: number;
  antialias: boolean;
  segments: number;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: { stars: 400, dprMax: 1, antialias: false, segments: 40 },
  medium: { stars: 900, dprMax: 1.5, antialias: true, segments: 70 },
  high: { stars: 1800, dprMax: 2, antialias: true, segments: 110 },
};

// ---- 전경 인터랙티브 오브젝트 (클릭 → 인포 패널/포커스) ----
export interface FocusObject {
  id: string;
  label: string;
  title: string;
  body: string;
  position: [number, number, number];
  shape: "octahedron" | "icosahedron" | "torus";
}

export const DEFAULT_OBJECTS: FocusObject[] = [
  {
    id: "layers",
    label: "레이어",
    title: "5개 깊이 레이어",
    body: "배경 -44, 원경 -28, 중경 -16, 근경 -6, 전경 +2. z 값이 클수록 가까우며 포인터에 더 크게 반응합니다.",
    position: [-3.6, 0.8, 2],
    shape: "octahedron",
  },
  {
    id: "camera",
    label: "카메라",
    title: "하나로 합성된 카메라",
    body: "포인터 회전, 스크롤 dolly, 포커스 이동은 한 개의 카메라 상태로 합성되어 서로 충돌하지 않습니다.",
    position: [3.4, -0.2, 0],
    shape: "icosahedron",
  },
  {
    id: "depth",
    label: "깊이",
    title: "안개와 광원",
    body: "Fog가 먼 층을 흐리게 하고, 커서를 따르는 점광원이 전경 오브젝트에 입체감을 줍니다.",
    position: [0.2, 2.4, -2],
    shape: "torus",
  },
];

// ---- 외부 데이터 주입용 props 계약 ----
export interface DepthParallaxHeroProps {
  title?: string;
  description?: string;
  kicker?: string;
  ctaLabel?: string;
  objects?: FocusObject[];
  initialSettings?: Partial<HeroSettings>;
}

export function resolveSettings(partial?: Partial<HeroSettings>): HeroSettings {
  return { ...DEFAULT_SETTINGS, ...partial, layers: { ...DEFAULT_SETTINGS.layers, ...partial?.layers } };
}
