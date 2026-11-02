import type { QualityTier } from "@/lib/hero/performance";
import type { Facing, SlotIndex, UnitRecord, UnitStatus, ViewMode } from "./types";

export const ACCENT = "#3fd0bd";
export const DEMO_LABEL = "DEMO · 샘플 데이터";
export const DEMO_NOTICE = "표시된 가격·면적·분양 상태는 모두 샘플입니다. 실제 매물이 아니며 계약 조건을 보증하지 않습니다.";
export const VIEW_NOTICE = "조망 화면은 샘플 주변 모형이며 실제 조망을 보증하지 않습니다.";

/** 모델 교체 지점: GLB 경로를 넣으면 절차적 모델 대신 로드한다(노드 이름 규칙은 ASSET_CHECKLIST). */
export const MODEL_ASSET: { url: string | null } = { url: null };

export const ASSET_CHECKLIST: readonly string[] = [
  "단위 m, Y-up, 원점은 건물 바닥 중심. 층 높이 0.5 / 호실 높이 0.44 기준(비율만 같으면 스케일 가능)",
  "층 그룹 노드 `F_<층>` (예: F_5). 층 그룹 하위에 호실 노드 `U_<id>` (예: U_101-502)",
  "선택 가능한 호실 노드마다 id 가 매물 JSON 의 `id` 와 정확히 일치(누락 시 절차적 모델로 대체)",
  "옥상 노드 `ROOF`(선택), 층별 복도 노드 `C_<층>`(선택, 단면 모드에서만 표시)",
  "호실 재질은 코드가 상태별 재질로 교체하므로 슬롯 1개면 충분. 애니메이션 클립 없음",
  "폴리곤 합계 5만 이하 권장, 텍스처 2048px 이하, 라이선스·소유권 확인 후 반입",
];

// ───────── 건물 치수 (절차적 모델 기준) ─────────
export const FLOOR_H = 0.5;
export const SLAB_H = 0.06;
export const UNIT_H = FLOOR_H - SLAB_H;
export const UNIT_W = 1.9;
export const UNIT_D = 1.1;
export const FLOOR_MIN = 1;
export const FLOOR_MAX = 7;

export const SLOT_POS: Record<SlotIndex, [number, number]> = {
  0: [-1, 0.65],
  1: [1, 0.65],
  2: [-1, -0.65],
  3: [1, -0.65],
};
export const SLOT_FACING: Record<SlotIndex, Facing> = { 0: "남", 1: "동", 2: "서", 3: "북" };
export const FACING_VECTOR: Record<Facing, [number, number]> = { 남: [0, 1], 동: [1, 0], 서: [-1, 0], 북: [0, -1] };

export const STATUS_META: Record<UnitStatus, { label: string; color: string }> = {
  available: { label: "분양 가능", color: "#2fbf9f" },
  reserved: { label: "예약 중", color: "#e0a030" },
  sold: { label: "분양 완료", color: "#7a8497" },
};
export const STATUS_ORDER: readonly UnitStatus[] = ["available", "reserved", "sold"];

export const VIEW_LABEL: Record<ViewMode, string> = { exterior: "외관", window: "창 방향 조망", floorplan: "층 평면(단면)" };

export const CAMERA = {
  fov: 38,
  homeDir: [5.5, 3.6, 7.2] as const,
  homeTarget: [0, 1.6, 0] as const,
  minDistance: 0.3,
  maxDistance: 16,
  duration: 1.0,
  autoRotateSpeed: 0.5,
};

export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; environment: boolean }> = {
  low: { dpr: 1, environment: false },
  medium: { dpr: 1.5, environment: true },
  high: { dpr: 2, environment: true },
};

/** 조망 확인용 샘플 주변 모형(방향마다 다르게). */
export const SURROUNDINGS: ReadonlyArray<{ kind: "box" | "cone" | "disc"; pos: [number, number, number]; size: [number, number, number]; color: string }> = [
  { kind: "disc", pos: [0, 0.01, 9], size: [4.5, 0.02, 4.5], color: "#3f7a5a" }, // 남: 공원
  { kind: "box", pos: [10, 2.2, -2], size: [1.6, 4.4, 1.6], color: "#59647a" }, // 동: 고층
  { kind: "box", pos: [10, 3.0, 2.5], size: [1.4, 6.0, 1.4], color: "#667088" },
  { kind: "box", pos: [-9, 0.5, 1], size: [2, 1, 1.6], color: "#6b6258" }, // 서: 저층
  { kind: "box", pos: [-10, 0.4, -3], size: [2, 0.8, 1.4], color: "#5d6a62" },
  { kind: "cone", pos: [0, 2.2, -13], size: [5, 4.4, 5], color: "#4a5a4f" }, // 북: 산
];

export function unitLabel(u: Pick<UnitRecord, "dong" | "floor" | "ho">): string {
  return `${u.dong}동 ${u.floor}층 ${u.ho}호`;
}

export function formatPrice(man: number): string {
  const eok = Math.floor(man / 10000);
  const rest = man % 10000;
  if (eok === 0) return `${rest.toLocaleString("ko-KR")}만원`;
  return rest === 0 ? `${eok}억원` : `${eok}억 ${rest.toLocaleString("ko-KR")}만원`;
}

/** 호실 중심(월드 좌표, 층 중간 높이). */
export function unitCenter(u: Pick<UnitRecord, "floor" | "slot">): [number, number, number] {
  const [x, z] = SLOT_POS[u.slot];
  return [x, (u.floor - 1) * FLOOR_H + SLAB_H + UNIT_H * 0.55, z];
}
