import {
  DAYLIGHT_BY_ID,
  DEFAULT_CONFIG,
  DOOR,
  FURNITURE,
  FURNITURE_BY_ID,
  MATERIALS,
  MOVE_STEP,
  ROOM,
  WINDOW,
  type PricingAdapter,
} from "./config";
import type { FurnitureId, ItemState, MaterialOption, SceneConfig, SurfaceId } from "./types";

// ───────── 기하 ─────────
export function footprint(id: FurnitureId, it: ItemState): { hw: number; hd: number } {
  const f = FURNITURE_BY_ID[id];
  return it.rot === 1 ? { hw: f.d / 2, hd: f.w / 2 } : { hw: f.w / 2, hd: f.d / 2 };
}

const snap = (v: number) => Math.round(v / MOVE_STEP) * MOVE_STEP;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** 방 안으로 클램프하고 격자에 맞춘다. */
export function clampToRoom(id: FurnitureId, it: ItemState, x: number, z: number): ItemState {
  const { hw, hd } = footprint(id, it);
  const mx = ROOM.w / 2 - hw;
  const mz = ROOM.d / 2 - hd;
  return { ...it, x: r2(Math.min(mx, Math.max(-mx, snap(x)))), z: r2(Math.min(mz, Math.max(-mz, snap(z)))) };
}

/** 배치된 가구 중 서로 겹치는(러그 제외) 가구 id 집합. 간단한 AABB 검사이며 통행 폭·소방 이격은 검증하지 않는다. */
export function findOverlaps(config: SceneConfig): Set<FurnitureId> {
  const hit = new Set<FurnitureId>();
  const list = FURNITURE.filter((f) => !f.overlapExempt && config.items[f.id].placed);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = config.items[list[i].id];
      const b = config.items[list[j].id];
      const fa = footprint(list[i].id, a);
      const fb = footprint(list[j].id, b);
      if (Math.abs(a.x - b.x) < fa.hw + fb.hw - 1e-6 && Math.abs(a.z - b.z) < fa.hd + fb.hd - 1e-6) {
        hit.add(list[i].id);
        hit.add(list[j].id);
      }
    }
  }
  return hit;
}

// ───────── 소재 ─────────
export function materialOf(surface: SurfaceId, id: string): MaterialOption {
  return MATERIALS[surface].find((m) => m.id === id) ?? MATERIALS[surface][0];
}

// ───────── 견적 ─────────
export const SURFACE_AREA: Record<SurfaceId, number> = {
  floor: r2(ROOM.w * ROOM.d),
  ceiling: r2(ROOM.w * ROOM.d),
  wall: r2(2 * (ROOM.w + ROOM.d) * ROOM.h - WINDOW.w * WINDOW.h - DOOR.w * DOOR.h),
};

export interface EstimateLine {
  key: string;
  label: string;
  detail: string;
  amount: number;
}
export interface Estimate {
  lines: EstimateLine[];
  base: number;
  extras: EstimateLine[];
  extrasTotal: number;
  total: number;
  source: PricingAdapter["source"];
}

export function computeEstimate(config: SceneConfig, pricing: PricingAdapter): Estimate {
  const lines: EstimateLine[] = [];
  (Object.keys(MATERIALS) as SurfaceId[]).forEach((s) => {
    const m = materialOf(s, config[s]);
    lines.push({ key: s, label: `${s === "floor" ? "바닥" : s === "wall" ? "벽" : "천장"} · ${m.label}`, detail: `${SURFACE_AREA[s]}㎡ × ${m.pricePerM2.toLocaleString("ko-KR")}원`, amount: Math.round(SURFACE_AREA[s] * m.pricePerM2) });
  });
  let furnitureSum = 0;
  let count = 0;
  for (const f of FURNITURE) {
    if (!config.items[f.id].placed) continue;
    furnitureSum += f.price;
    count++;
    lines.push({ key: f.id, label: f.name, detail: "1개", amount: f.price });
  }
  const base = lines.reduce((s, l) => s + l.amount, 0);
  const surfaceArea = SURFACE_AREA.floor + SURFACE_AREA.wall + SURFACE_AREA.ceiling;
  const { vars } = pricing;
  const extras: EstimateLine[] = [
    { key: "install", label: "가구 설치비 (별도 변수)", detail: `가구 합계의 ${Math.round(vars.installRate * 100)}%`, amount: Math.round(furnitureSum * vars.installRate) },
    { key: "delivery", label: "배송비 (별도 변수)", detail: count > 0 ? "정액" : "가구 없음", amount: count > 0 ? vars.deliveryFlat : 0 },
    { key: "construction", label: "표면 시공비 (별도 변수)", detail: `${r2(surfaceArea)}㎡ × ${vars.constructionPerM2.toLocaleString("ko-KR")}원`, amount: Math.round(surfaceArea * vars.constructionPerM2) },
  ];
  const extrasTotal = extras.reduce((s, l) => s + l.amount, 0);
  return { lines, base, extras, extrasTotal, total: base + extrasTotal, source: pricing.source };
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

// ───────── 직렬화 / 구성 ID ─────────
export function serializeScene(config: SceneConfig): string {
  const items: Record<string, ItemState> = {};
  for (const f of FURNITURE) {
    const it = config.items[f.id];
    items[f.id] = { placed: it.placed, x: it.x, z: it.z, rot: it.rot };
  }
  return JSON.stringify({ v: 1, floor: config.floor, wall: config.wall, ceiling: config.ceiling, daylight: config.daylight, items });
}

/** 불러온 JSON 검증. 알 수 없는 값이 있으면 null. */
export function parseScene(text: string): SceneConfig | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (o.v !== 1) return null;
    for (const s of ["floor", "wall", "ceiling"] as SurfaceId[]) {
      if (typeof o[s] !== "string" || !MATERIALS[s].some((m) => m.id === o[s])) return null;
    }
    if (typeof o.daylight !== "string" || !(o.daylight in DAYLIGHT_BY_ID)) return null;
    if (!o.items || typeof o.items !== "object") return null;
    const src = o.items as Record<string, Partial<ItemState>>;
    const items = {} as SceneConfig["items"];
    for (const f of FURNITURE) {
      const it = src[f.id];
      if (!it || typeof it.placed !== "boolean" || !Number.isFinite(it.x) || !Number.isFinite(it.z) || (it.rot !== 0 && it.rot !== 1)) return null;
      items[f.id] = clampToRoom(f.id, { placed: it.placed, x: it.x as number, z: it.z as number, rot: it.rot }, it.x as number, it.z as number);
    }
    return { floor: o.floor as string, wall: o.wall as string, ceiling: o.ceiling as string, daylight: o.daylight as SceneConfig["daylight"], items };
  } catch {
    return null;
  }
}

/** 구성 내용에서 계산한 짧은 ID(djb2). 같은 구성이면 같은 ID. */
export function configId(config: SceneConfig): string {
  const s = serializeScene(config);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `CFG-${h.toString(36).toUpperCase().padStart(7, "0")}`;
}

export function placedItemNames(config: SceneConfig): string[] {
  return FURNITURE.filter((f) => config.items[f.id].placed).map((f) => f.name);
}

export function isDefaultConfig(config: SceneConfig): boolean {
  return serializeScene(config) === serializeScene(DEFAULT_CONFIG);
}

// ───────── 측정 이벤트 (개인정보 제외) ─────────
export type HeroEventName = "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit";
/** window 로 CustomEvent("hero-analytics")를 쏜다. 실제 수집 도구 연결은 소비 측 책임. 이름·구성 ID·개수만 담는다. */
export function track(name: HeroEventName, detail?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero-analytics", { detail: { name, hero: "property-interior-configurator", ...detail } }));
}
