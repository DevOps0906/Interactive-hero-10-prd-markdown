import type { QualityTier } from "@/lib/hero/performance";

export type Phase = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "error";
export type ForceMode = "attract" | "repel";

/** 화면 설정 패널에서 조절하는 값. --hero-speed / --hero-intensity 토큰과 대응. */
export interface HeroSettings {
  speed: number; // 0.25~2
  intensity: number; // 0.25~2
  density: number; // 입자 수 배율 0.25~1.5
  linkDistance: number; // px, 근접 간선 거리
  forceMode: ForceMode;
  showEdges: boolean;
  showTrail: boolean;
  showStats: boolean;
}

export const DEFAULT_SETTINGS: HeroSettings = {
  speed: 1,
  intensity: 1,
  density: 1,
  linkDistance: 110,
  forceMode: "attract",
  showEdges: true,
  showTrail: true,
  showStats: false,
};

/** 외부 데이터 주입용 props 계약. */
export interface CursorConstellationHeroProps {
  brandText?: string;
  ctaHref?: string;
  ctaLabel?: string;
  initialSettings?: Partial<HeroSettings>;
}

export interface Preset {
  /** 기준 면적(REF_AREA)에서의 입자 수 */
  count: number;
  trailMax: number;
}

export const REF_AREA = 1200 * 700;

export const PRESETS: Record<QualityTier, Preset> = {
  low: { count: 90, trailMax: 40 },
  medium: { count: 160, trailMax: 80 },
  high: { count: 260, trailMax: 140 },
};

export interface PointerState {
  x: number;
  y: number;
  vx: number; // px/s (평활)
  vy: number;
  inside: boolean;
  down: boolean;
  lastMove: number; // performance.now()
}

export interface Stats {
  fps: number;
  particles: number;
  edges: number;
  pairChecks: number;
  tier: QualityTier;
  dpr: number;
}

export interface SceneCommands {
  burst: () => void;
  toggleLogo: () => boolean;
  reset: () => void;
}

export const PHASE_LABEL: Record<Phase, string> = {
  loading: "불러오는 중…",
  intro: "인트로 재생 중",
  idle: "대기 — 커서를 움직여 보세요",
  interacting: "상호작용 중",
  transitioning: "전환 중 (폭발 → 재집결)",
  error: "효과를 표시할 수 없어 정적 화면으로 대체했습니다",
};
