export type SlotId = "top" | "bottom" | "outer";
export type ShotId = "full" | "upper" | "detail";
export type SizeId = "S" | "M" | "L" | "XL";

/** 원단·색상 스와치. SKU 접미사와 가격 가산이 붙는다(데모 mockData). */
export interface Swatch {
  id: string;
  name: string;
  fabric: string;
  color: string;
  roughness: number;
  skuSuffix: string;
  priceDelta: number;
}

/** 절차적 형태 변형. GLB 교체 시에는 node(메시 이름)만 쓴다. */
export type GarmentShape = "tee" | "shirt" | "knit" | "jeans" | "chino" | "skirt" | "blazer" | "coat";

export interface GarmentItem {
  id: string;
  slot: SlotId;
  name: string;
  sku: string;
  price: number;
  shape: GarmentShape;
  /** GLB 안의 의류 루트 노드 이름(자산 계약) */
  node: string;
  swatches: Swatch[];
}

export interface CameraShot {
  id: ShotId;
  label: string;
  desc: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface SizeRow {
  size: SizeId;
  chest: number;
  waist: number;
  length: number;
}

/** 현재 코디(HTML 패널과 3D가 같은 데이터에서 렌더링한다). */
export interface Look {
  top: string;
  bottom: string;
  outer: string | null;
  swatch: Record<SlotId, string>;
}
