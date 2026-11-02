import type { QualityTier } from "@/lib/hero/performance";

// 사용자 조절 옵션 (--hero-speed / --hero-intensity / --hero-accent 와 대응)
export type Settings = {
  speed: number;
  intensity: number;
  accent: string;
  labels: boolean;
  flow: boolean;
  autoRotate: boolean;
  simulate: boolean;
  paused: boolean;
  nodeCap: number;
};

export const DEFAULT_SETTINGS: Settings = {
  speed: 1,
  intensity: 1,
  accent: "#5eead4",
  labels: true,
  flow: true,
  autoRotate: true,
  simulate: true,
  paused: false,
  nodeCap: 200,
};

export const ACCENTS: readonly { name: string; value: string }[] = [
  { name: "민트", value: "#5eead4" },
  { name: "바이올렛", value: "#a78bfa" },
  { name: "앰버", value: "#fbbf24" },
];

export type QualityPreset = {
  maxNodes: number;
  maxDots: number;
  maxLabels: number;
  sphereSegments: number;
  antialias: boolean;
};

// 성능 프리셋: 등급이 내려가면 노드 수·flow dots·라벨 수·세그먼트가 줄어든다.
export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: { maxNodes: 28, maxDots: 40, maxLabels: 10, sphereSegments: 8, antialias: false },
  medium: { maxNodes: 44, maxDots: 120, maxLabels: 18, sphereSegments: 12, antialias: true },
  high: { maxNodes: 120, maxDots: 260, maxLabels: 28, sphereSegments: 16, antialias: true },
};

export const TIER_ORDER: readonly QualityTier[] = ["low", "medium", "high"];

export const lowerTier = (a: QualityTier, b: QualityTier): QualityTier =>
  TIER_ORDER[Math.min(TIER_ORDER.indexOf(a), TIER_ORDER.indexOf(b))];

// 그룹 색 (절제된 채도)
export const GROUP_COLORS: Record<string, string> = {
  root: "#e8edf5",
  ai: "#7aa2f7",
  web: "#5eead4",
  data: "#f0abfc",
  design: "#fda4af",
  science: "#bef264",
  biz: "#fcd34d",
};

export const GROUP_NAMES: Record<string, string> = {
  root: "중심",
  ai: "인공지능",
  web: "웹",
  data: "데이터",
  design: "디자인",
  science: "과학",
  biz: "비즈니스",
};

export const CAMERA_HOME = { position: [0, 2.5, 12] as const, fov: 50 };
export const FOCUS_DISTANCE = 5.5;
