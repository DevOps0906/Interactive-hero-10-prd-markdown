import type { LayerValues, RegionData, RegionId, ViewMode } from "./types";

/** 데모 표기: 모든 의료 문구·의료진·시간표는 예시이며 진단·치료 효과를 뜻하지 않는다. */
export const DEMO_NOTICE = "DEMO · 일반 안내용 예시 콘텐츠입니다. 진단·치료 효과를 보장하지 않으며 실제 진료는 의료진 상담이 필요합니다.";
export const MEDICAL_DISCLAIMER = "의학적 정확성 전문가 검수 전 데모 문구입니다. 증상·민감정보는 이 화면에서 입력하지 않습니다.";

/**
 * 모델 교체 지점. url 을 지정하면 GLB 를 로드하고 없으면 절차적 모델을 쓴다.
 * 노드 이름 규약은 README 의 자산 체크리스트 참고(`skin_*`, `muscle_*`, `bone_*`).
 */
export const MODEL_ASSET: { url: string | null; units: "m"; upAxis: "Y"; expectedLayerPrefixes: readonly string[] } = {
  url: null, // 예: "/models/hospital-anatomy-explorer/body.glb"
  units: "m",
  upAxis: "Y",
  expectedLayerPrefixes: ["skin_", "muscle_", "bone_"],
};

export const POSTER_URL = "/posters/hospital-anatomy-explorer/poster.svg";
export const BOOKING_PATH = "/reservation"; // 데모: 실제 예약 페이지 경로로 교체
export const ACCENT = "#3fd0bd";

export const LAYER_LABEL = { skin: "피부", muscle: "근육", bone: "뼈" } as const;
export const LAYER_ORDER = ["skin", "muscle", "bone"] as const;

export const VIEW_PRESETS: Record<Exclude<ViewMode, "custom">, { label: string; values: LayerValues }> = {
  skin: { label: "피부", values: { skin: 0.85, muscle: 0, bone: 0 } },
  muscle: { label: "근육", values: { skin: 0.12, muscle: 0.95, bone: 0 } },
  bone: { label: "뼈", values: { skin: 0.08, muscle: 0.1, bone: 1 } },
  all: { label: "전체", values: { skin: 0.3, muscle: 0.5, bone: 1 } },
};

export const CAMERA = {
  home: [0, 0.2, 8] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  fov: 35,
  /** 오브젝트를 과하게 잘라내지 않도록 거리 제한 */
  minDistance: 3.2,
  maxDistance: 11,
  focusDuration: 0.9,
  autoRotateSpeed: 0.8,
};

export const QUALITY_PRESETS = {
  low: { dpr: 1, segments: 12, environment: false },
  medium: { dpr: 1.5, segments: 20, environment: true },
  high: { dpr: 2, segments: 32, environment: true },
} as const;

/** 외부 데이터 adapter 자리. 데모에서는 mockData 를 쓴다(DEMO 라벨 필수). */
export const mockRegions: RegionData[] = [
  {
    id: "shoulder",
    label: "어깨",
    department: "정형외과 · 어깨 클리닉",
    departmentCode: "ortho-shoulder",
    marker: [0.6, 1.05, 0.2],
    focus: { position: [2.4, 1.3, 4.2], target: [0.5, 1.0, 0] },
    summary: "어깨는 팔을 들고 돌리는 큰 움직임을 담당하는 관절입니다. 팔을 움직일 때 불편함이 이어지면 정형외과에서 상담을 받을 수 있습니다.",
    flow: ["예약 및 접수", "의료진 상담", "필요 시 영상 검사 안내", "상담 결과에 따른 다음 단계 안내"],
    checkup: "어깨 관련 일반 검진 안내(예시): 관절 움직임 범위 확인, 영상 검사 필요 여부 상담.",
    doctors: [
      { name: "의료진 예시 A", role: "정형외과 전문의 (데모)", note: "어깨 질환 일반 상담 담당 예시" },
      { name: "의료진 예시 B", role: "재활의학과 전문의 (데모)", note: "운동 재활 상담 예시" },
    ],
  },
  {
    id: "spine",
    label: "척추",
    department: "신경외과 · 척추센터",
    departmentCode: "spine-center",
    marker: [0, 0.75, 0.3],
    focus: { position: [0.8, 1.0, 4.6], target: [0, 0.6, 0] },
    summary: "척추는 몸을 지탱하고 신경을 보호하는 구조입니다. 허리나 목의 불편이 계속될 때 척추센터에서 상담을 받을 수 있습니다.",
    flow: ["예약 및 접수", "의료진 상담", "필요 시 검사 안내", "생활 습관·운동 안내"],
    checkup: "척추 관련 일반 검진 안내(예시): 자세·움직임 확인, 검사 필요 여부 상담.",
    doctors: [
      { name: "의료진 예시 C", role: "신경외과 전문의 (데모)", note: "척추 일반 상담 담당 예시" },
      { name: "의료진 예시 D", role: "마취통증의학과 전문의 (데모)", note: "통증 관리 상담 예시" },
    ],
  },
  {
    id: "hip",
    label: "고관절",
    department: "정형외과 · 관절센터",
    departmentCode: "ortho-joint",
    marker: [0.3, -0.3, 0.26],
    focus: { position: [2.6, 0.1, 4.2], target: [0.2, -0.4, 0] },
    summary: "고관절은 체중을 지탱하며 걷고 앉는 동작을 돕는 관절입니다. 걷거나 일어설 때 불편이 느껴지면 관절센터에서 상담할 수 있습니다.",
    flow: ["예약 및 접수", "의료진 상담", "필요 시 영상 검사 안내", "관리 계획 안내"],
    checkup: "관절 관련 일반 검진 안내(예시): 보행·관절 가동 범위 확인, 검사 필요 여부 상담.",
    doctors: [{ name: "의료진 예시 E", role: "정형외과 전문의 (데모)", note: "관절 일반 상담 담당 예시" }],
  },
  {
    id: "knee",
    label: "무릎",
    department: "정형외과 · 무릎 클리닉",
    departmentCode: "ortho-knee",
    marker: [0.3, -1.4, 0.22],
    focus: { position: [2.4, -0.9, 4.2], target: [0.3, -1.4, 0] },
    summary: "무릎은 걷기·계단 오르내리기·앉았다 일어서기에서 큰 역할을 하는 관절입니다. 불편이 이어지면 정형외과에서 상담을 받을 수 있습니다.",
    flow: ["예약 및 접수", "의료진 상담", "필요 시 영상 검사 안내", "재활·운동 안내"],
    checkup: "무릎 관련 일반 검진 안내(예시): 관절 움직임 확인, 검사 필요 여부 상담.",
    doctors: [
      { name: "의료진 예시 F", role: "정형외과 전문의 (데모)", note: "무릎 질환 일반 상담 담당 예시" },
      { name: "의료진 예시 G", role: "재활의학과 전문의 (데모)", note: "운동 재활 상담 예시" },
    ],
  },
];

export const REGION_IDS = mockRegions.map((r) => r.id) as RegionId[];
export const getRegion = (id: RegionId | null) => (id ? mockRegions.find((r) => r.id === id) ?? null : null);

/** 모의 예약 시간대(데모). 실제 시간표는 외부 adapter 로 주입. */
export const mockSlots = ["오전 (데모)", "오후 (데모)", "저녁 (데모)"] as const;
