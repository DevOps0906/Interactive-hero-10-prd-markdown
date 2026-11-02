import { FLOOR_MAX, FLOOR_MIN, SLOT_FACING } from "./config";
import type { SlotIndex, UnitRecord, UnitStatus, UnitsAdapter } from "./types";

const TYPES: Record<SlotIndex, { type: string; area: number }> = {
  0: { type: "59A", area: 59.97 },
  1: { type: "74B", area: 74.92 },
  2: { type: "84C", area: 84.98 },
  3: { type: "101D", area: 101.3 },
};
const UPDATED_AT = "2026-11-03 09:00 (샘플 기준)";

function statusFor(floor: number, slot: number): UnitStatus {
  const v = (floor * 3 + slot * 5) % 7;
  if (v <= 1) return "sold";
  if (v === 2) return "reserved";
  return "available";
}

/** 결정적 샘플 매물(28건). 실제 매물이 아니다. */
export function createMockUnits(): UnitRecord[] {
  const units: UnitRecord[] = [];
  for (let floor = FLOOR_MIN; floor <= FLOOR_MAX; floor++) {
    for (const s of [0, 1, 2, 3] as const) {
      const { type, area } = TYPES[s];
      const supply = Math.round(area * 1.32 * 100) / 100;
      const perM2 = 1150 + floor * 22 + (s === 3 ? 60 : 0);
      const ho = floor * 100 + s + 1;
      units.push({
        id: `101-${ho}`,
        dong: "101",
        floor,
        ho,
        slot: s,
        type,
        facing: SLOT_FACING[s],
        exclusiveArea: area,
        supplyArea: supply,
        priceMan: Math.round((supply * perM2) / 10) * 10,
        maintenanceFeeMan: Math.round(supply * 0.28),
        status: statusFor(floor, s),
        updatedAt: UPDATED_AT,
      });
    }
  }
  return units;
}

/** 데모 adapter. 실서비스는 인증된 매물 DB 를 읽는 adapter 로 교체한다. */
export const mockAdapter: UnitsAdapter = { source: "mock", load: createMockUnits };
