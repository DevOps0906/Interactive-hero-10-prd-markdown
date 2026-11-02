import type { Colorway, MaterialId, PartId, SneakerConfig, StockStatus, Variant, ViewId } from "./types";

/** 모델 교체 지점. url 을 "/models/sneaker-customizer/sneaker.glb" 로 바꾸면 GLB 를 쓴다(없으면 절차적 모델). */
export const MODEL_ASSET: {
  url: string | null;
  /** GLB 안에서 찾을 노드(메시) 이름 — 자산 체크리스트와 동일해야 한다 */
  nodes: Record<PartId, string>;
  unit: "m";
  axis: "Y-up, +X = toe, 길이 약 3.05 단위(실제 크기는 스케일로 맞춘다)";
} = {
  url: null,
  nodes: { upper: "upper", sole: "sole", laces: "laces", heel: "heel" },
  unit: "m",
  axis: "Y-up, +X = toe, 길이 약 3.05 단위(실제 크기는 스케일로 맞춘다)",
};

export const PARTS: { id: PartId; label: string; desc: string }[] = [
  { id: "upper", label: "갑피", desc: "발등을 감싸는 본체" },
  { id: "sole", label: "밑창", desc: "쿠셔닝과 접지를 맡는 바닥" },
  { id: "laces", label: "끈", desc: "발등 조임" },
  { id: "heel", label: "뒤꿈치", desc: "뒤꿈치 보강 패치" },
];

export const PALETTE: Colorway[] = [
  { id: "chalk", name: "차크 화이트", hex: "#f1eee7" },
  { id: "ink", name: "잉크 네이비", hex: "#26324f" },
  { id: "clay", name: "클레이 오렌지", hex: "#d0764a" },
  { id: "moss", name: "모스 그린", hex: "#6a8a58" },
  { id: "sky", name: "스카이 블루", hex: "#86b4d8" },
  { id: "sand", name: "샌드 베이지", hex: "#d9c59b" },
  { id: "rose", name: "로즈 핑크", hex: "#dc8c9d" },
  { id: "coal", name: "차콜", hex: "#3b3f4a" },
];
export const colorOf = (id: string): Colorway => PALETTE.find((c) => c.id === id) ?? PALETTE[0];

/** 재료 프리셋: 색상 선택은 이 프리셋(거칠기·텍스처·가격)에 매핑된다. */
export const MATERIALS: Record<MaterialId, { label: string; note: string; roughness: number; bump: number; repeat: [number, number]; surcharge: number; code: string }> = {
  canvas: { label: "캔버스", note: "촘촘한 직조, 가볍고 튼튼함", roughness: 0.85, bump: 0.5, repeat: [14, 5], surcharge: 0, code: "CV" },
  mesh: { label: "메쉬", note: "통기성 좋은 그물 구조", roughness: 0.6, bump: 0.9, repeat: [10, 4], surcharge: 10000, code: "MS" },
  suede: { label: "스웨이드", note: "부드러운 기모 질감", roughness: 0.95, bump: 0.25, repeat: [8, 3], surcharge: 20000, code: "SD" },
};
export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export const SIZES = [230, 240, 250, 260, 270, 280, 290];
export const BASE_PRICE = 129000;

export const DEFAULT_CONFIG: SneakerConfig = {
  colors: { upper: "chalk", sole: "coal", laces: "clay", heel: "ink" },
  material: "canvas",
  size: 270,
};

// ───────── mockData (DEMO) — 실제 연동은 아래 StockAdapter 구현으로 교체 ─────────
const STOCK_MOCK: Record<MaterialId, Record<number, number>> = {
  canvas: { 230: 4, 240: 12, 250: 20, 260: 18, 270: 9, 280: 2, 290: 0 },
  mesh: { 230: 0, 240: 6, 250: 11, 260: 8, 270: 3, 280: 5, 290: 1 },
  suede: { 230: 2, 240: 3, 250: 7, 260: 5, 270: 0, 280: 4, 290: 2 },
};
/** 이 소재에서는 해당 갑피 색이 단종(데모) */
const DISCONTINUED: Partial<Record<MaterialId, string[]>> = { suede: ["sky", "rose"] };

export const STATUS_LABEL: Record<StockStatus, string> = { in: "재고 있음", low: "재고 적음", out: "품절" };

export function resolveVariant(c: SneakerConfig): Variant {
  const m = MATERIALS[c.material];
  const code = (["upper", "sole", "laces", "heel"] as PartId[]).map((p) => c.colors[p].slice(0, 2).toUpperCase()).join(".");
  const sku = `SC-${m.code}-${code}-${c.size}`;
  const price = BASE_PRICE + m.surcharge;
  const gone = DISCONTINUED[c.material]?.includes(c.colors.upper);
  const stock = gone ? 0 : (STOCK_MOCK[c.material][c.size] ?? 0);
  const status: StockStatus = stock <= 0 ? "out" : stock <= 3 ? "low" : "in";
  const reason = stock > 0 ? null : gone ? `${m.label} 소재의 이 갑피 색은 단종되었습니다(데모).` : `${c.size}mm ${m.label} 재고가 없습니다(데모).`;
  return { sku, price, stock, status, reason };
}

export const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

// ───────── Cart adapter (DEMO: 메모리 전용, 실제 API 로 교체) ─────────
export interface CartAdapter {
  add(sku: string, size: number, currentQty: number, stock: number): Promise<void>;
}
export const demoCartAdapter: CartAdapter = {
  add: (_sku, _size, currentQty, stock) =>
    new Promise((resolve, reject) => {
      window.setTimeout(() => (currentQty + 1 > stock ? reject(new Error(`재고(${stock}개)를 넘어 담을 수 없습니다.`)) : resolve()), 350);
    }),
};

// ───────── 카메라·품질 ─────────
export const CAMERA = {
  fov: 34,
  target: [0, 0.25, 0] as [number, number, number],
  minDistance: 1.4,
  maxDistance: 9,
  free: [4.2, 2.3, 4.6] as [number, number, number],
  tweenMs: 700,
};
export const VIEWS: { id: ViewId; label: string; pos: [number, number, number] }[] = [
  { id: "free", label: "기본", pos: CAMERA.free },
  { id: "side", label: "측면", pos: [0.001, 0.6, 7] },
  { id: "top", label: "상단", pos: [0.3, 7.2, 0.4] },
  { id: "rear", label: "후면", pos: [-7, 1.1, 0.4] },
  { id: "detail", label: "소재 확대", pos: [1.0, 1.0, 1.9] },
];

export const SPIN_MS = 2600;
export const EXPLODE: Record<PartId, [number, number, number]> = {
  upper: [0, 0.2, 0],
  sole: [0, -0.8, 0],
  laces: [0.1, 0.9, 0],
  heel: [-0.9, 0.15, 0],
};
export const EXPLODE_AUTO_RETURN_MS = 9000;

export const QUALITY = {
  low: { dpr: 1, aa: false, env: 64, shadow: false },
  medium: { dpr: 1.5, aa: true, env: 128, shadow: true },
  high: { dpr: 2, aa: true, env: 256, shadow: true },
} as const;
