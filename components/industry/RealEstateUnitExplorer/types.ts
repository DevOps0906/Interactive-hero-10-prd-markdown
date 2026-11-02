export type UnitStatus = "available" | "reserved" | "sold";
export type Facing = "남" | "동" | "서" | "북";
export type ViewMode = "exterior" | "window" | "floorplan";
export type SlotIndex = 0 | 1 | 2 | 3;

/** 매물 1건. 가격 단위는 만원, 면적은 ㎡. 실데이터는 adapter 로만 주입한다. */
export interface UnitRecord {
  id: string; // 3D 노드 이름 `U_<id>` 와 1:1
  dong: string;
  floor: number;
  ho: number;
  slot: SlotIndex; // 층 안의 위치(0 남서 앞 / 1 남동 / 2 북서 / 3 북동)
  type: string;
  facing: Facing;
  exclusiveArea: number;
  supplyArea: number;
  priceMan: number;
  maintenanceFeeMan: number;
  status: UnitStatus;
  updatedAt: string;
}

/** 외부 매물 DB 연결 지점. 데모는 mockAdapter. */
export interface UnitsAdapter {
  source: "mock" | "live";
  load(): UnitRecord[];
}
