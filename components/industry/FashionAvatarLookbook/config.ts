import type { CameraShot, GarmentItem, Look, SizeRow, SlotId, Swatch } from "./types";
import type { QualityTier } from "@/lib/hero/performance";

/** GLB 교체 지점. url 을 채우면 Scene 이 GLB 를 로드한다(비어 있으면 절차적 모델). 외부 URL 금지. */
export const MODEL_ASSET: { url: string | null; avatarNode: string } = {
  url: null, // 예: "/models/fashion-avatar-tryon/lookbook.glb"
  avatarNode: "Avatar_Neutral",
};

export const DEMO_LABEL = "DEMO";
export const ACCENT = "#0f766e"; // app --color-primary 와 동일(포인트 컬러 1개)

export const SLOT_LABEL: Record<SlotId, string> = { top: "상의", bottom: "하의", outer: "아우터" };
export const SLOTS: SlotId[] = ["top", "bottom", "outer"];

const sw = (id: string, name: string, fabric: string, color: string, roughness: number, priceDelta = 0): Swatch => ({
  id,
  name,
  fabric,
  color,
  roughness,
  skuSuffix: id.toUpperCase(),
  priceDelta,
});

/** mockData: 가격(KRW)·SKU 는 데모 예시이며 실제 상품 데이터가 아니다. 실서비스에서는 adapter 로 주입한다. */
export const ITEMS: GarmentItem[] = [
  { id: "tee", slot: "top", name: "베이직 코튼 티셔츠", sku: "DM-T-001", price: 29000, shape: "tee", node: "Top_Tee", swatches: [sw("ivr", "아이보리", "코튼 저지", "#e8e2d2", 0.9), sw("blk", "블랙", "코튼 저지", "#2b2d33", 0.9), sw("sky", "스카이", "코튼 저지", "#7fa6c9", 0.9, 2000)] },
  { id: "shirt", slot: "top", name: "옥스포드 셔츠", sku: "DM-T-002", price: 59000, shape: "shirt", node: "Top_Shirt", swatches: [sw("wht", "화이트", "옥스포드", "#f1f0ec", 0.75), sw("bls", "블루 스트라이프", "옥스포드", "#8fb0d6", 0.75, 3000), sw("sag", "세이지", "옥스포드", "#9bac8f", 0.75, 3000)] },
  { id: "knit", slot: "top", name: "램스울 니트", sku: "DM-T-003", price: 79000, shape: "knit", node: "Top_Knit", swatches: [sw("oat", "오트밀", "램스울", "#cdbfa6", 1), sw("bgd", "버건디", "램스울", "#8a2f3d", 1, 5000), sw("nvy", "네이비", "램스울", "#2f3f66", 1)] },
  { id: "jeans", slot: "bottom", name: "스트레이트 데님", sku: "DM-B-001", price: 69000, shape: "jeans", node: "Bottom_Jeans", swatches: [sw("ind", "인디고", "12oz 데님", "#3b5278", 0.85), sw("lgt", "라이트 블루", "12oz 데님", "#7f9ec2", 0.85), sw("blk", "블랙", "12oz 데님", "#25272c", 0.85, 4000)] },
  { id: "chino", slot: "bottom", name: "코튼 치노 팬츠", sku: "DM-B-002", price: 55000, shape: "chino", node: "Bottom_Chino", swatches: [sw("bge", "베이지", "치노 트윌", "#cbb48f", 0.9), sw("khk", "카키", "치노 트윌", "#7d7a52", 0.9), sw("chc", "차콜", "치노 트윌", "#4a4f58", 0.9)] },
  { id: "skirt", slot: "bottom", name: "플리츠 미디 스커트", sku: "DM-B-003", price: 62000, shape: "skirt", node: "Bottom_Skirt", swatches: [sw("blk", "블랙", "폴리 플리츠", "#2a2b30", 0.6), sw("crm", "크림", "폴리 플리츠", "#e4d9c2", 0.6), sw("olv", "올리브", "폴리 플리츠", "#6f7547", 0.6, 3000)] },
  { id: "blazer", slot: "outer", name: "싱글 블레이저", sku: "DM-O-001", price: 139000, shape: "blazer", node: "Outer_Blazer", swatches: [sw("gry", "그레이", "울 블렌드", "#8a8e96", 0.95), sw("nvy", "네이비", "울 블렌드", "#2c3a5e", 0.95), sw("blk", "블랙", "울 블렌드", "#26272b", 0.95, 5000)] },
  { id: "coat", slot: "outer", name: "롱 울 코트", sku: "DM-O-002", price: 219000, shape: "coat", node: "Outer_Coat", swatches: [sw("cml", "카멜", "울 캐시미어", "#b48a5a", 1), sw("chc", "차콜", "울 캐시미어", "#44474f", 1), sw("ivr", "아이보리", "울 캐시미어", "#e3dccd", 1, 8000)] },
];

export const itemById = (id: string): GarmentItem => ITEMS.find((i) => i.id === id) ?? ITEMS[0];
export const itemsOf = (slot: SlotId) => ITEMS.filter((i) => i.slot === slot);

export const DEFAULT_LOOK: Look = {
  top: "tee",
  bottom: "jeans",
  outer: null,
  swatch: { top: "ivr", bottom: "ind", outer: "gry" },
};

export const CAMERA_SHOTS: CameraShot[] = [
  { id: "full", label: "전신", desc: "전신 샷", position: [0, 1.05, 4.3], target: [0, 0.92, 0] },
  { id: "upper", label: "상체", desc: "상체 샷", position: [0, 1.4, 2.3], target: [0, 1.28, 0] },
  { id: "detail", label: "디테일", desc: "소재·봉제 디테일 샷", position: [0.55, 1.3, 1.25], target: [0.12, 1.25, 0] },
];
export const INTRO_CAMERA: [number, number, number] = [0, 1.6, 6.5];

/** 데모 실측표(cm). 실제 상품 치수가 아니다. */
export const SIZE_TABLE: SizeRow[] = [
  { size: "S", chest: 92, waist: 78, length: 66 },
  { size: "M", chest: 98, waist: 84, length: 68 },
  { size: "L", chest: 104, waist: 90, length: 70 },
  { size: "XL", chest: 110, waist: 96, length: 72 },
];

export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; segments: number; environment: boolean }> = {
  low: { dpr: 1, segments: 16, environment: false },
  medium: { dpr: 1.5, segments: 28, environment: true },
  high: { dpr: 2, segments: 40, environment: true },
};

export const formatKRW = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function swatchOf(item: GarmentItem, id: string): Swatch {
  return item.swatches.find((s) => s.id === id) ?? item.swatches[0];
}

export interface LookLine {
  slot: SlotId;
  item: GarmentItem;
  swatch: Swatch;
  sku: string;
  price: number;
}
/** 현재 코디의 라인 목록(SKU·가격 포함). 패널·장바구니·3D 가 공유한다. */
export function lookLines(look: Look): LookLine[] {
  const out: LookLine[] = [];
  for (const slot of SLOTS) {
    const id = look[slot];
    if (!id) continue;
    const item = itemById(id);
    const swatch = swatchOf(item, look.swatch[slot]);
    out.push({ slot, item, swatch, sku: `${item.sku}-${swatch.skuSuffix}`, price: item.price + swatch.priceDelta });
  }
  return out;
}
