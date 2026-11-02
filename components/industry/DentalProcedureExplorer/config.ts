// Dental Procedure Explorer 설정·데이터 계약. 모든 문구는 일반 안내용 데모이며 의료 광고·진단이 아니다.
// 외부 변경 데이터(의료진·진료시간)는 DentalData adapter 로 주입한다(기본값 = DEMO_DATA).

export type Jaw = "upper" | "lower";
export type ToothKind = "incisor" | "canine" | "premolar" | "molar";
export type ViewMode = "arch" | "cutaway";
export type LayerId = "enamel" | "dentin" | "pulp" | "root";
export type BeforeAfter = "off" | "before" | "after";
export type StepVisual = "arch" | "scan" | "prep" | "crown" | "brackets" | "wire" | "align";
export type ProcedureId = "checkup" | "prosthetic" | "orthodontic";

export const ACCENT = "#3fd0bd";
export const DEFAULT_TOOTH_ID = "16"; // 선택이 없을 때 단면도·절차 예시에 쓰는 대표 치아(위 오른쪽 첫째 큰어금니)

export interface Tooth {
  /** FDI 치아 번호. 3D Mesh 이름은 `tooth-<id>` (GLB 교체 시 동일 규칙) */
  id: string;
  name: string;
  kind: ToothKind;
  jaw: Jaw;
  position: [number, number, number];
  rotY: number;
  size: [number, number, number];
}

const KIND_BY_N: ToothKind[] = ["incisor", "incisor", "canine", "premolar", "premolar", "molar", "molar"];
const NAME_BY_N = ["중절치(앞니)", "측절치(앞니)", "견치(송곳니)", "제1소구치", "제2소구치", "제1대구치", "제2대구치"];
const WIDTH_BY_N = [0.3, 0.25, 0.28, 0.26, 0.26, 0.38, 0.36];
const HEIGHT_BY_KIND: Record<ToothKind, number> = { incisor: 0.46, canine: 0.5, premolar: 0.4, molar: 0.36 };
const DEPTH_BY_KIND: Record<ToothKind, number> = { incisor: 0.2, canine: 0.26, premolar: 0.3, molar: 0.4 };
// FDI 사분면: 1 위 오른쪽, 2 위 왼쪽, 3 아래 왼쪽, 4 아래 오른쪽. 환자 오른쪽 = 화면 왼쪽(x<0)
const QUADRANTS: { q: number; jaw: Jaw; side: -1 | 1; label: string }[] = [
  { q: 1, jaw: "upper", side: -1, label: "위 오른쪽" },
  { q: 2, jaw: "upper", side: 1, label: "위 왼쪽" },
  { q: 3, jaw: "lower", side: 1, label: "아래 왼쪽" },
  { q: 4, jaw: "lower", side: -1, label: "아래 오른쪽" },
];

function buildTeeth(): Tooth[] {
  const teeth: Tooth[] = [];
  for (const { q, jaw, side, label } of QUADRANTS) {
    let cum = 0.02;
    const narrow = jaw === "lower" ? 0.93 : 1;
    for (let n = 1; n <= 7; n++) {
      const w = WIDTH_BY_N[n - 1];
      const ax = (cum + w / 2) * narrow;
      cum += w + 0.01;
      const x = side * ax;
      const z = 1.3 - 0.33 * x * x;
      const kind = KIND_BY_N[n - 1];
      teeth.push({
        id: `${q}${n}`,
        name: `${label} ${NAME_BY_N[n - 1]}`,
        kind,
        jaw,
        position: [x, jaw === "upper" ? 0.27 : -0.27, z],
        rotY: Math.atan(0.66 * x),
        size: [w, HEIGHT_BY_KIND[kind], DEPTH_BY_KIND[kind]],
      });
    }
  }
  return teeth;
}

export const TEETH: Tooth[] = buildTeeth();
export const TEETH_BY_ID: Record<string, Tooth> = Object.fromEntries(TEETH.map((t) => [t.id, t]));
export const toothLabel = (id: string) => `${id}번 ${TEETH_BY_ID[id]?.name ?? ""}`.trim();

/** 화면 표시 순서: 환자 오른쪽이 화면 왼쪽 */
export const CHART_ROWS: Record<Jaw, string[]> = {
  upper: [...[7, 6, 5, 4, 3, 2, 1].map((n) => `1${n}`), ...[1, 2, 3, 4, 5, 6, 7].map((n) => `2${n}`)],
  lower: [...[7, 6, 5, 4, 3, 2, 1].map((n) => `4${n}`), ...[1, 2, 3, 4, 5, 6, 7].map((n) => `3${n}`)],
};

export const KIND_INFO: Record<ToothKind, { title: string; summary: string; role: string }> = {
  incisor: { title: "앞니(절치)", summary: "앞쪽에 있는 납작한 치아로 음식을 자르는 역할을 하며 발음과 외모에도 관여합니다.", role: "자르기" },
  canine: { title: "송곳니(견치)", summary: "끝이 뾰족하고 뿌리가 긴 치아로 음식을 찢는 역할을 하며 치열의 모서리를 이룹니다.", role: "찢기" },
  premolar: { title: "작은어금니(소구치)", summary: "앞니와 큰어금니 사이에 있으며 음식을 으깨고 찢는 역할을 함께 합니다.", role: "으깨기" },
  molar: { title: "큰어금니(대구치)", summary: "씹는 면이 넓고 뿌리가 여러 갈래인 경우가 많아 음식을 잘게 갈아 줍니다.", role: "갈기" },
};

export interface LayerInfo {
  id: LayerId;
  name: string;
  text: string;
  color: string;
}

export const LAYERS: LayerInfo[] = [
  { id: "enamel", name: "법랑질", text: "치아 가장 바깥의 단단한 층으로 우리 몸에서 가장 단단한 조직으로 알려져 있습니다.", color: "#f2efe6" },
  { id: "dentin", name: "상아질", text: "법랑질 아래의 층으로 치아의 대부분을 이루며, 자극을 안쪽으로 전달할 수 있습니다.", color: "#e3c88f" },
  { id: "pulp", name: "치수(신경·혈관)", text: "치아 중심부의 연한 조직으로 신경과 혈관이 지나가며 치아에 영양을 공급합니다.", color: "#d9534f" },
  { id: "root", name: "치근(뿌리)", text: "잇몸뼈 속에 자리해 치아를 지지하는 부분입니다. 치아 종류에 따라 뿌리 수가 다릅니다.", color: "#d9c9a0" },
];

export interface StepSpec {
  title: string;
  body: string;
  visual: StepVisual;
}

export interface ProcedureSpec {
  id: ProcedureId;
  name: string;
  summary: string;
  steps: StepSpec[];
}

export const PROCEDURES: ProcedureSpec[] = [
  {
    id: "checkup",
    name: "검진·예방",
    summary: "정기 검진과 구강 관리에서 일반적으로 거치는 순서 예시입니다.",
    steps: [
      { title: "문진·상담", body: "불편한 점과 평소 관리 습관을 이야기합니다.", visual: "arch" },
      { title: "구강 검사", body: "치아와 잇몸 상태를 눈으로 살피고 필요한 부위를 확인합니다.", visual: "scan" },
      { title: "영상 검사(필요한 경우)", body: "눈으로 보기 어려운 부위는 의료진 판단에 따라 영상 검사를 할 수 있습니다.", visual: "scan" },
      { title: "결과 설명·관리 안내", body: "검사 내용을 설명하고 일반적인 관리 방법을 안내합니다.", visual: "arch" },
    ],
  },
  {
    id: "prosthetic",
    name: "보철(크라운)",
    summary: "치아 위에 씌우는 보철물 치료의 일반적인 순서 예시입니다. 실제 과정은 개인별로 다릅니다.",
    steps: [
      { title: "상담·검사", body: "치아 상태를 확인하고 가능한 치료 방법을 설명합니다.", visual: "scan" },
      { title: "치아 형태 정리", body: "보철물이 들어갈 공간을 만들기 위해 치아 형태를 다듬는 단계입니다.", visual: "prep" },
      { title: "본뜨기·임시 치아", body: "치아 모양을 본뜨고 보철물이 완성될 때까지 임시 치아를 사용할 수 있습니다.", visual: "prep" },
      { title: "보철물 장착", body: "완성된 보철물을 치아에 맞춰 붙입니다.", visual: "crown" },
      { title: "교합 확인·관리", body: "씹는 느낌을 확인하고 사후 관리 방법을 안내합니다.", visual: "crown" },
    ],
  },
  {
    id: "orthodontic",
    name: "교정",
    summary: "치아 배열을 맞추는 교정 상담의 일반적인 순서 예시입니다. 기간·결과는 개인별로 다릅니다.",
    steps: [
      { title: "상담·정밀검사", body: "치아 배열과 얼굴 구조를 살피고 가능한 방법을 설명합니다.", visual: "scan" },
      { title: "장치 부착", body: "치아 표면에 교정 장치를 붙이는 단계입니다.", visual: "brackets" },
      { title: "와이어 조정", body: "장치에 와이어를 연결하고 정해진 간격으로 조정합니다.", visual: "wire" },
      { title: "정렬 확인", body: "치아가 계획한 방향으로 움직이는지 주기적으로 확인합니다.", visual: "align" },
      { title: "유지 장치 안내", body: "정렬 상태를 유지하기 위한 장치 사용법을 안내합니다.", visual: "arch" },
    ],
  },
];

export const PROCEDURE_BY_ID: Record<ProcedureId, ProcedureSpec> = Object.fromEntries(PROCEDURES.map((p) => [p.id, p])) as Record<ProcedureId, ProcedureSpec>;

export interface DoctorInfo {
  procedureId: ProcedureId;
  name: string;
  field: string;
  hours: string;
}

/** 외부 데이터 주입 지점: 실제 의료진·진료시간으로 교체한다(심의 완료 정보만). */
export interface DentalData {
  doctors: DoctorInfo[];
  consultTypes: { id: string; label: string }[];
}

export const DEMO_DATA: DentalData = {
  doctors: [
    { procedureId: "checkup", name: "홍길동 원장 (DEMO)", field: "일반진료·예방", hours: "평일 09:00–18:00 (데모 예시)" },
    { procedureId: "prosthetic", name: "김보철 원장 (DEMO)", field: "보철", hours: "화·목 10:00–19:00 (데모 예시)" },
    { procedureId: "orthodontic", name: "이교정 원장 (DEMO)", field: "교정", hours: "수·토 09:30–17:30 (데모 예시)" },
  ],
  consultTypes: [
    { id: "general", label: "일반 상담" },
    { id: "checkup", label: "검진 상담" },
    { id: "prosthetic", label: "보철 상담" },
    { id: "orthodontic", label: "교정 상담" },
  ],
};

export const DISCLAIMERS = {
  demo: "데모 화면입니다. 표시된 의료진·시간·절차는 예시이며 실제 진료 정보가 아닙니다.",
  general: "일반적인 안내이며 진단·치료 권유가 아닙니다. 실제 상태와 치료는 의료진 상담으로 결정됩니다.",
  beforeAfter: "교육용 도식입니다. 특정 환자의 사례가 아니며 치료 결과·효과를 보장하지 않습니다.",
  privacy: "상담 예약에는 이름·연락처만 사용하며 증상 등 건강 정보는 입력하지 않습니다. 데모에서는 전송·저장되지 않습니다.",
};

// ───────── 3D 설정 ─────────
/** GLB 교체 지점. url 을 지정하면 `tooth-<FDI>` 이름의 노드를 치아로 사용한다(public/models/clinic-dental-3d/README.md 체크리스트). */
export const MODEL_ASSET: { url: string | null } = { url: null };

export const CAMERA = {
  fov: 38,
  home: [0, 2.6, 5.6] as [number, number, number],
  homeTarget: [0, 0, 0.5] as [number, number, number],
  cutaway: [0, 1.0, 4.6] as [number, number, number],
  cutawayTarget: [0, 0.2, 0] as [number, number, number],
  minDistance: 2.2,
  maxDistance: 9,
};

export type QualityTier = "low" | "medium" | "high";
export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; segments: number; environment: boolean }> = {
  low: { dpr: 1, segments: 10, environment: false },
  medium: { dpr: 1.5, segments: 16, environment: true },
  high: { dpr: 2, segments: 24, environment: true },
};

export const MOBILE_MQ = "(max-width: 767px)";
