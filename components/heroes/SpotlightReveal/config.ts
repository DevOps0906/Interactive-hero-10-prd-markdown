import type { QualityTier } from "@/lib/hero/performance";

export type Phase = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";
export type TouchMode = "drag" | "toggle";

export type SpotlightOptions = {
  /** 기본 마스크 반지름(px) */
  radius: number;
  /** 추적·전환 속도 배율 (--hero-speed) */
  speed: number;
  /** 속도 왜곡 강도 0~1 (--hero-intensity) */
  intensity: number;
  /** 강조색 (--hero-accent) */
  accent: string;
  distortion: boolean;
  touchMode: TouchMode;
  /** 두 레이어를 겹쳐 보는 디버그(인터랙션 1 시연) */
  showLayers: boolean;
};

export type SceneContent = {
  eyebrow: string;
  title: string;
  body: string;
  chips: readonly string[];
};

export const DEFAULT_OPTIONS: SpotlightOptions = {
  radius: 150,
  speed: 1,
  intensity: 0.6,
  accent: "#3fd0bd",
  distortion: true,
  touchMode: "drag",
  showLayers: false,
};

export const DEFAULT_SCENES: readonly [SceneContent, SceneContent] = [
  {
    eyebrow: "Surface",
    title: "SURFACE",
    body: "겉으로 보이는 첫 번째 장면. 커서를 움직여 아래에 감춰진 장면을 찾아보세요.",
    chips: ["Explore", "Signal", "Layers"],
  },
  {
    eyebrow: "Depth",
    title: "DEPTH",
    body: "숨겨진 두 번째 장면. 같은 자리에 겹쳐 있던 또 다른 이야기가 드러납니다.",
    chips: ["Reveal", "Focus", "Expand"],
  },
];

export const ACCENTS: readonly { name: string; value: string }[] = [
  { name: "민트", value: "#3fd0bd" },
  { name: "앰버", value: "#e0a030" },
  { name: "바이올렛", value: "#a78bfa" },
];

export const BRAND = { bg: "#080B12", fg: "#eef0f3" } as const;

export type QualityPreset = {
  distortion: boolean;
  glow: boolean;
  /** 마스크 불투명 구간 비율(1-feather가 페더 폭) */
  opaqueStop: number;
  /** 왜곡 최대 비율 */
  maxStretch: number;
};

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  high: { distortion: true, glow: true, opaqueStop: 0.6, maxStretch: 0.6 },
  medium: { distortion: true, glow: false, opaqueStop: 0.6, maxStretch: 0.45 },
  low: { distortion: false, glow: false, opaqueStop: 0.75, maxStretch: 0 },
};

export const PHASE_LABEL: Record<Phase, string> = {
  loading: "로딩 중",
  intro: "인트로",
  idle: "대기",
  interacting: "조작 중",
  transitioning: "장면 전환 중",
  fallback: "폴백(효과 미지원)",
};

export const INTERACTIONS: readonly { id: number; label: string; how: string }[] = [
  { id: 1, label: "이중 레이어 정합", how: "‘레이어 겹쳐 보기’로 두 장면의 정합 확인" },
  { id: 2, label: "포인터 → CSS 변수", how: "Stage 위에서 포인터 이동 (--mx/--my)" },
  { id: 3, label: "lerp 추적 지연", how: "빠르게 움직였다 멈추면 원이 뒤따라옴" },
  { id: 4, label: "링크·CTA 진입 시 크기", how: "Stage 안 칩 또는 CTA에 올리기/포커스" },
  { id: 5, label: "속도 비례 타원 왜곡", how: "빠르게 흔들기, 멈추면 원복" },
  { id: 6, label: "클릭 시 전체 확장·전환", how: "CTA 클릭 또는 아래 ‘장면 확장’ 버튼" },
  { id: 7, label: "터치·키보드 대안", how: "터치 드래그/탭, 또는 Tab 후 방향키·+/-·Enter" },
];
