import type { FloorSpec, HotspotSpec, MaterialSpec, TimeSpec, TourStep, Vec3, ViewMode } from "./types";
import type { QualityTier } from "@/lib/hero/performance";

export const DEMO_LABEL = "DEMO";

/** GLB 교체 지점. url 을 채우면 절차적 모델 대신 GLB 를 로드한다(메시 이름은 FLOORS[].id 와 `<id>_facade`). */
export const MODEL_ASSET: { url: string | null } = { url: null };

export const FLOOR_HEIGHT = 0.75;
export const EXPLODE_GAP = 0.9;

export const FLOORS: FloorSpec[] = [
  { id: "floor_01", label: "1F 로비·전시", use: "공용 로비, 모형 전시, 상담 데스크", area: 420, y: 0, rooms: [
    { name: "로비", x: 8, y: 8, w: 56, h: 38 }, { name: "상담", x: 68, y: 8, w: 24, h: 38 }, { name: "전시", x: 8, y: 50, w: 84, h: 22 } ] },
  { id: "floor_02", label: "2F 설계 스튜디오", use: "오픈 스튜디오, 모델링 작업 공간", area: 410, y: FLOOR_HEIGHT, rooms: [
    { name: "스튜디오 A", x: 8, y: 8, w: 40, h: 64 }, { name: "스튜디오 B", x: 52, y: 8, w: 40, h: 40 }, { name: "자료실", x: 52, y: 52, w: 40, h: 20 } ] },
  { id: "floor_03", label: "3F 회의·리뷰", use: "프로젝트 리뷰룸, 소회의실", area: 400, y: FLOOR_HEIGHT * 2, rooms: [
    { name: "리뷰룸", x: 8, y: 8, w: 52, h: 40 }, { name: "회의 1", x: 64, y: 8, w: 28, h: 18 }, { name: "회의 2", x: 64, y: 30, w: 28, h: 18 }, { name: "라운지", x: 8, y: 52, w: 84, h: 20 } ] },
  { id: "floor_04", label: "4F 대표실·테라스", use: "대표실, 테라스 라운지", area: 380, y: FLOOR_HEIGHT * 3, rooms: [
    { name: "대표실", x: 8, y: 8, w: 36, h: 36 }, { name: "테라스", x: 48, y: 8, w: 44, h: 64 }, { name: "서재", x: 8, y: 48, w: 36, h: 24 } ] },
  { id: "roof", label: "옥상", use: "옥상 정원, 설비 공간", area: 360, y: FLOOR_HEIGHT * 4, rooms: [
    { name: "옥상 정원", x: 8, y: 8, w: 60, h: 64 }, { name: "설비", x: 72, y: 8, w: 20, h: 30 } ] },
];

export const MATERIALS: MaterialSpec[] = [
  { id: "concrete", label: "노출 콘크리트", color: "#aeb4bf", roughness: 0.85, metalness: 0.02, note: "데모 재질: 실제 시공 가능 자재·마감과 다를 수 있습니다." },
  { id: "timber", label: "목재 루버", color: "#b98b5e", roughness: 0.65, metalness: 0.02, note: "데모 재질: 방화·내구 성능은 별도 검토가 필요합니다." },
  { id: "glass", label: "유리 커튼월", color: "#8fb4cf", roughness: 0.25, metalness: 0.35, note: "데모 재질: 열·빛 성능은 계산하지 않은 시각 표현입니다." },
];

export const TIMES: TimeSpec[] = [
  { id: "day", label: "주간", sun: 2.6, hemi: 0.9, ambient: 0.5, env: 1.2, windows: 0.05, note: "시각 연출용 조명입니다. 일조·그림자 분석 결과가 아닙니다." },
  { id: "dusk", label: "노을", sun: 1.2, hemi: 0.6, ambient: 0.35, env: 0.8, windows: 0.7, note: "시각 연출용 조명입니다. 일조·그림자 분석 결과가 아닙니다." },
  { id: "night", label: "야간", sun: 0.25, hemi: 0.35, ambient: 0.25, env: 0.45, windows: 1.8, note: "야간 창문 발광 연출입니다. 실제 조명 계획이 아닙니다." },
];

export const HOTSPOTS: HotspotSpec[] = [
  { id: "entrance", label: "입구", floor: "floor_01", offset: [0, 0.3, 1.25], title: "입구 캐노피", body: "도로에서 로비로 이어지는 완만한 진입부. 데모 설명이며 실제 프로젝트 사양이 아닙니다." },
  { id: "lobby", label: "로비", floor: "floor_01", offset: [-1.0, 0.4, 0.9], title: "이중 높이 로비", body: "전시와 상담이 만나는 공용 공간. 데모 설명이며 실제 도면과 다를 수 있습니다." },
  { id: "rooftop", label: "옥상", floor: "roof", offset: [0.6, 0.35, 0], title: "옥상 정원", body: "스튜디오 구성원이 쓰는 옥상 정원 구상안. 인허가·구조 검토 결과가 아닙니다." },
];

export const TOUR_STEPS: TourStep[] = [
  { id: "overview", label: "전경", position: [7, 5.5, 7], target: [0, 1.5, 0], text: "대지 위에 놓인 4층 규모의 전경입니다." },
  { id: "entry", label: "진입부", position: [1.5, 1.2, 6.2], target: [0, 1.0, 0], text: "낮은 시점에서 입구와 로비 유리면을 바라봅니다." },
  { id: "roof", label: "옥상", position: [-4.5, 7.5, 4.5], target: [0, 2.8, 0], text: "위에서 내려다보는 옥상 정원과 매스 구성입니다." },
];

export const VIEWS: Record<Exclude<ViewMode, "tour">, { label: string; position: Vec3 }> = {
  iso: { label: "아이소", position: [7, 6, 7] },
  front: { label: "정면", position: [0.01, 2.6, 10] },
  top: { label: "상부", position: [0.01, 11, 3.5] },
};

export const CAMERA = {
  fov: 38,
  target: [0, 1.5, 0] as Vec3,
  minDistance: 6,
  maxDistance: 16,
  minPolar: Math.PI * 0.08,
  maxPolar: Math.PI * 0.49,
  morphDuration: 1.4,
  drawDuration: 2.4,
  /** 도면·전환이 실패해도 이 시간(ms) 뒤에는 반드시 완성 상태가 된다. */
  deadlineMs: 5200,
  tourStepMs: 3600,
};

export const QUALITY_PRESETS: Record<QualityTier, { environment: boolean; shadows: boolean; antialias: boolean }> = {
  low: { environment: false, shadows: false, antialias: false },
  medium: { environment: true, shadows: false, antialias: true },
  high: { environment: true, shadows: true, antialias: true },
};

export const ACCENT = "#e8b64c";

export const POSTER_SRC = "/posters/architecture-building-reveal/poster.svg";

export const FOOTPRINT = { w: 3.0, d: 2.0 } as const;
