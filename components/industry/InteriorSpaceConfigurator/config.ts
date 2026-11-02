import type { QualityTier } from "@/lib/hero/performance";
import type { DaylightId, DaylightPreset, FurnitureId, FurnitureSpec, MaterialOption, SceneConfig, SurfaceId, Vec3, Viewpoint } from "./types";

/** 공간 치수(m). 데모 값이며 현장 실측이 아니다. */
export const ROOM = { w: 4.2, d: 3.4, h: 2.5 } as const;
export const WINDOW = { w: 1.4, h: 1.2, sill: 0.9, z: -0.4 } as const; // 동쪽 벽
export const DOOR = { w: 0.9, h: 2.0, z: 0.9 } as const; // 서쪽 벽

/**
 * GLB 교체 지점. room 에 공간 셸 GLB 경로를, furniture 에 가구별 GLB 경로를 넣으면 절차적 모델 대신 로드한다.
 * 예: { room: "/models/property-interior-configurator/room.glb" }. 로드 실패 시 절차적 모델로 폴백한다.
 * 규약: 셸 재질 이름은 MaterialOption.slot(MAT_Floor/MAT_Wall/MAT_Ceiling), 가구 GLB 는 원점=바닥 중앙, 단위 m.
 */
export const MODEL_ASSET: { room: string | null; furniture: Partial<Record<FurnitureId, string>> } = { room: null, furniture: {} };

export const FLOORS: MaterialOption[] = [
  { id: "oak", label: "오크 마루", slot: "MAT_Floor", color: "#c8a375", roughness: 0.55, metalness: 0, pricePerM2: 62000 },
  { id: "walnut", label: "월넛 마루", slot: "MAT_Floor", color: "#8a5f3f", roughness: 0.5, metalness: 0, pricePerM2: 88000 },
  { id: "concrete", label: "콘크리트", slot: "MAT_Floor", color: "#9aa0a8", roughness: 0.85, metalness: 0, pricePerM2: 38000 },
  { id: "tile", label: "화이트 타일", slot: "MAT_Floor", color: "#e4e6ea", roughness: 0.2, metalness: 0.05, pricePerM2: 54000 },
];
export const WALLS: MaterialOption[] = [
  { id: "warm", label: "웜 화이트", slot: "MAT_Wall", color: "#efe9df", roughness: 0.9, metalness: 0, pricePerM2: 9000 },
  { id: "sage", label: "세이지", slot: "MAT_Wall", color: "#a9b8a3", roughness: 0.9, metalness: 0, pricePerM2: 11000 },
  { id: "greige", label: "그레이지", slot: "MAT_Wall", color: "#b8afa4", roughness: 0.9, metalness: 0, pricePerM2: 11000 },
  { id: "navy", label: "딥 네이비", slot: "MAT_Wall", color: "#4b5d7a", roughness: 0.85, metalness: 0, pricePerM2: 14000 },
];
export const CEILINGS: MaterialOption[] = [
  { id: "white", label: "화이트", slot: "MAT_Ceiling", color: "#f4f4f2", roughness: 0.95, metalness: 0, pricePerM2: 8000 },
  { id: "cream", label: "크림", slot: "MAT_Ceiling", color: "#eadfc8", roughness: 0.95, metalness: 0, pricePerM2: 9000 },
  { id: "wood", label: "우드 패널", slot: "MAT_Ceiling", color: "#b98d62", roughness: 0.6, metalness: 0, pricePerM2: 46000 },
];
export const MATERIALS: Record<SurfaceId, MaterialOption[]> = { floor: FLOORS, wall: WALLS, ceiling: CEILINGS };
export const SURFACE_LABEL: Record<SurfaceId, string> = { floor: "바닥", wall: "벽", ceiling: "천장" };

export const FURNITURE: FurnitureSpec[] = [
  { id: "sofa", name: "3인 소파", node: "FURN_Sofa", w: 2.0, d: 0.9, h: 0.85, price: 890000, color: "#6f7f93", initial: { placed: true, x: 0, z: -1.2, rot: 0 } },
  { id: "table", name: "커피 테이블", node: "FURN_Table", w: 1.2, d: 0.7, h: 0.45, price: 240000, color: "#b08a62", initial: { placed: true, x: 0, z: -0.1, rot: 0 } },
  { id: "rug", name: "러그", node: "FURN_Rug", w: 2.2, d: 1.5, h: 0.02, price: 180000, color: "#b86f5e", overlapExempt: true, initial: { placed: true, x: 0, z: -0.1, rot: 0 } },
  { id: "shelf", name: "책장", node: "FURN_Shelf", w: 0.9, d: 0.35, h: 1.9, price: 320000, color: "#d6c3a3", initial: { placed: false, x: -1.9, z: -0.5, rot: 1 } },
  { id: "lamp", name: "플로어 램프", node: "FURN_Lamp", w: 0.4, d: 0.4, h: 1.6, price: 120000, color: "#5e6676", initial: { placed: false, x: 1.7, z: -1.35, rot: 0 } },
];
export const FURNITURE_BY_ID = Object.fromEntries(FURNITURE.map((f) => [f.id, f])) as Record<FurnitureId, FurnitureSpec>;

export const DEFAULT_CONFIG: SceneConfig = {
  floor: "oak",
  wall: "warm",
  ceiling: "white",
  daylight: "afternoon",
  items: Object.fromEntries(FURNITURE.map((f) => [f.id, { ...f.initial }])) as SceneConfig["items"],
};

/** 가구 이동 격자(m) */
export const MOVE_STEP = 0.1;

export const DAYLIGHTS: DaylightPreset[] = [
  { id: "morning", label: "오전", note: "낮은 각도의 따뜻한 빛", background: "#e6e2dc", ambient: 0.35, hemiSky: "#ffe7c9", hemiGround: "#8a8176", hemi: 0.7, sun: "#ffd9a8", sunIntensity: 2.2, sunPosition: [6, 2.2, 1], env: 0.7, sky: "#ffe2b8", lampOn: false },
  { id: "afternoon", label: "오후", note: "밝은 자연광", background: "#e9edf2", ambient: 0.5, hemiSky: "#eaf2ff", hemiGround: "#9a958d", hemi: 1.0, sun: "#fff6e8", sunIntensity: 3.2, sunPosition: [5, 6, 2], env: 1.0, sky: "#bfe0ff", lampOn: false },
  { id: "night", label: "야간", note: "실내 조명 위주", background: "#171b26", ambient: 0.28, hemiSky: "#3a4a70", hemiGround: "#232834", hemi: 0.5, sun: "#7f93c9", sunIntensity: 0.4, sunPosition: [5, 4, 2], env: 0.25, sky: "#1d2745", lampOn: true },
];
export const DAYLIGHT_BY_ID = Object.fromEntries(DAYLIGHTS.map((d) => [d.id, d])) as Record<DaylightId, DaylightPreset>;

export const ORBIT_HOME: { position: Vec3; target: Vec3; fov: number; minDistance: number; maxDistance: number } = {
  position: [5.2, 4.4, 5.8],
  target: [0, 0.8, 0],
  fov: 40,
  minDistance: 5,
  maxDistance: 11,
};
export const VIEWPOINTS: Viewpoint[] = [
  { id: "entrance", label: "입구", position: [-1.8, 1.55, 1.3], target: [1.5, 1.1, -0.8] },
  { id: "window", label: "창가", position: [1.7, 1.55, 1.4], target: [-1.5, 1.0, -1.0] },
  { id: "north", label: "정면 벽", position: [0, 1.55, 1.5], target: [0, 1.1, -1.7] },
];
export const LOOK_STEP = Math.PI / 9;

export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; shadows: boolean; environment: boolean }> = {
  low: { dpr: 1, shadows: false, environment: false },
  medium: { dpr: 1.5, shadows: true, environment: true },
  high: { dpr: 2, shadows: true, environment: true },
};

/** 견적 변수(데모). 설치·배송·시공은 기준 단가와 분리해 표시한다. 실제 값은 adapter 로 주입한다. */
export interface EstimateVars {
  installRate: number; // 가구 합계 대비 설치비 비율
  deliveryFlat: number; // 배송비 정액(가구가 1개 이상일 때)
  constructionPerM2: number; // 표면 시공비(원/㎡)
}

/** 가격·재고 등 외부 데이터 주입 지점. 데모에서는 mockData 를 사용하고 DEMO 로 표시한다. */
export interface PricingAdapter {
  vars: EstimateVars;
  source: "DEMO" | "LIVE";
}
export const mockPricing: PricingAdapter = { vars: { installRate: 0.08, deliveryFlat: 80000, constructionPerM2: 18000 }, source: "DEMO" };

export const STORAGE_KEY = "interior-configurator:scene:v1";

/** 모델 교체 시 확인하는 자산 체크리스트 (README 와 동일) */
export const ASSET_CHECKLIST: string[] = [
  "단위 m, Y-up, 원점=방 바닥 중앙",
  "방 셸 재질 슬롯 이름: MAT_Floor / MAT_Wall / MAT_Ceiling",
  "가구 노드 이름: " + FURNITURE.map((f) => f.node).join(", "),
  "가구 원점=바닥 중앙, 전면=+Z, 실제 규격(m)과 일치",
  "폴리곤: 방 셸 5만 이하, 가구 1점당 2만 이하, 압축(Draco/Meshopt) 권장",
  "라이선스·소유권 확인, 외부 URL 로드 금지(public/models 에 배치)",
];
