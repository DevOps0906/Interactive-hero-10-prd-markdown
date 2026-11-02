export type FloorId = "floor_01" | "floor_02" | "floor_03" | "floor_04" | "roof";
export type MaterialId = "concrete" | "timber" | "glass";
export type TimeId = "day" | "dusk" | "night";
export type ViewMode = "iso" | "front" | "top" | "tour";
export type HotspotId = "entrance" | "lobby" | "rooftop";
export type Phase = "blueprint" | "morphing" | "ready" | "fallback";
export type Vec3 = readonly [number, number, number];

export interface FloorSpec {
  id: FloorId;
  label: string;
  use: string;
  /** DEMO 면적(㎡). 실제 설계 수치가 아니다. */
  area: number;
  /** 층 하단 y (모델 단위: m) */
  y: number;
  rooms: { name: string; x: number; y: number; w: number; h: number }[];
}

export interface MaterialSpec {
  id: MaterialId;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  note: string;
}

export interface TimeSpec {
  id: TimeId;
  label: string;
  sun: number;
  hemi: number;
  ambient: number;
  env: number;
  windows: number;
  note: string;
}

export interface HotspotSpec {
  id: HotspotId;
  label: string;
  floor: FloorId;
  offset: Vec3;
  title: string;
  body: string;
}

export interface TourStep {
  id: string;
  label: string;
  position: Vec3;
  target: Vec3;
  text: string;
}

export interface Snapshot {
  selectedId: FloorId | null;
  material: MaterialId;
  time: TimeId;
  exploded: boolean;
}
