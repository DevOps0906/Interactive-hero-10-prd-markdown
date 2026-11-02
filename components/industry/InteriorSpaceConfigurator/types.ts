export type Vec3 = [number, number, number];
export type SurfaceId = "floor" | "wall" | "ceiling";
export type FurnitureId = "sofa" | "table" | "shelf" | "lamp" | "rug";
/** 선택 가능한 대상: 표면(바닥/벽/천장) 또는 가구. */
export type SelectedId = SurfaceId | FurnitureId | null;
export type ViewMode = "orbit" | "walk";
export type DaylightId = "morning" | "afternoon" | "night";

export interface MaterialOption {
  id: string;
  label: string;
  /** GLB 교체 시 이 이름의 재질 슬롯(Material ID)을 치환한다 */
  slot: string;
  color: string;
  roughness: number;
  metalness: number;
  /** 데모 기준 단가 (원/㎡) */
  pricePerM2: number;
}

export interface ItemState {
  placed: boolean;
  x: number;
  z: number;
  /** 0 | 1 (90도 회전) */
  rot: 0 | 1;
}

export interface FurnitureSpec {
  id: FurnitureId;
  name: string;
  /** GLB 교체 시 인식할 노드 이름 */
  node: string;
  /** 실제 규격(m): 가로 w, 세로 d, 높이 h */
  w: number;
  d: number;
  h: number;
  /** 데모 기준 단가(원) */
  price: number;
  color: string;
  /** 겹침 검사 제외(러그 등 바닥 깔개) */
  overlapExempt?: boolean;
  initial: ItemState;
}

export interface SceneConfig {
  floor: string;
  wall: string;
  ceiling: string;
  daylight: DaylightId;
  items: Record<FurnitureId, ItemState>;
}

export interface Viewpoint {
  id: string;
  label: string;
  position: Vec3;
  target: Vec3;
}

export interface DaylightPreset {
  id: DaylightId;
  label: string;
  note: string;
  background: string;
  ambient: number;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: string;
  sunIntensity: number;
  sunPosition: Vec3;
  env: number;
  /** 창밖 색 */
  sky: string;
  lampOn: boolean;
}
