export type PartId = "upper" | "sole" | "laces" | "heel";
export type MaterialId = "canvas" | "mesh" | "suede";
export type ViewId = "free" | "side" | "top" | "rear" | "detail";
export type Phase = "loading" | "intro" | "idle" | "fallback";
export type StockStatus = "in" | "low" | "out";

export interface Colorway {
  id: string;
  name: string;
  hex: string;
}

/** 사용자가 바꾸는 값. 3D와 HTML 패널은 이 객체 하나에서 렌더링한다. */
export interface SneakerConfig {
  colors: Record<PartId, string>; // colorway id
  material: MaterialId;
  size: number;
}

export interface Variant {
  sku: string;
  price: number;
  stock: number;
  status: StockStatus;
  /** 주문 불가 사유(재고 없음 등) */
  reason: string | null;
}

export interface CartLine {
  sku: string;
  label: string;
  size: number;
  price: number;
  qty: number;
  stock: number;
}

export interface Notice {
  kind: "success" | "error" | "info";
  text: string;
  n: number;
}
