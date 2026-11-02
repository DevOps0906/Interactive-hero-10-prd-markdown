import type { QualityTier } from "@/lib/hero/performance";

export type Chapter = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  /** 인터랙션 시연 라벨(Controls 도움말) */
  demo: string;
};

// 인터랙션 1: 4개 챕터의 목적·스크롤 길이·카피. 길이 = 챕터당 1 viewport(CHAPTER_VH).
export const CHAPTERS: readonly Chapter[] = [
  { id: "intro", kicker: "CHAPTER 1", title: "Scroll Storytelling", body: "스크롤 한 번에 장면이 바뀝니다. 아래로 내려 3D 장치의 이야기를 따라가 보세요.", demo: "도입: 모델 천천히 회전" },
  { id: "approach", kicker: "CHAPTER 2", title: "가까이, 더 가까이", body: "카메라가 경로를 따라 다가가며 핵심 코어에 초점을 맞춥니다.", demo: "카메라 position/target 보간" },
  { id: "explode", kicker: "CHAPTER 3", title: "분해해서 보면", body: "외피가 폭발하듯 퍼지며 내부 구조가 드러납니다.", demo: "폭발 단계" },
  { id: "assemble", kicker: "CHAPTER 4", title: "다시, 하나로", body: "조각이 재조립되며 카메라는 처음 거리로 물러납니다.", demo: "재조립 + 카메라 복귀" },
];

export const CHAPTER_VH = 100;
export const LAST = CHAPTERS.length - 1;

export type Vec3 = readonly [number, number, number];
export type CameraKey = { at: number; position: Vec3; target: Vec3 };

// 인터랙션 3: progress(0~1) 기준 카메라 keyframe. 챕터 중심은 i/LAST.
export const CAMERA_KEYS: readonly CameraKey[] = [
  { at: 0, position: [0, 0.6, 6.5], target: [0, 0, 0] },
  { at: 1 / 3, position: [2.2, 0.8, 3.2], target: [0, 0.1, 0] },
  { at: 2 / 3, position: [-3.4, 1.8, 5.2], target: [0, 0, 0] },
  { at: 1, position: [0, 0.6, 6.5], target: [0, 0, 0] },
];

export type HeroSettings = {
  speed: number; // 0.5~2 회전·스크럽 반응 속도
  intensity: number; // 0.5~2 폭발 거리·조명
  accent: string;
  snap: boolean;
  tier: "auto" | QualityTier;
};

export const DEFAULT_SETTINGS: HeroSettings = { speed: 1, intensity: 1, accent: "#3fd0bd", snap: true, tier: "auto" };

export const ACCENTS = ["#3fd0bd", "#7aa2ff", "#ff9f6b"] as const;

export const PRESETS: Record<QualityTier, { segments: number; antialias: boolean; detail: number }> = {
  low: { segments: 6, antialias: false, detail: 0 },
  medium: { segments: 8, antialias: true, detail: 1 },
  high: { segments: 12, antialias: true, detail: 2 },
};

export type HeroStatus = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";

// 인터랙션 4: progress → 모델 단계 (회전·폭발). 순수 함수라 Scene 밖에서도 검증 가능.
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const explodeAmount = (p: number) => smooth(0.4, 0.6, p) * (1 - smooth(0.72, 0.95, p));
export const rotationAngle = (p: number) => p * Math.PI * 2;
export { smooth };
