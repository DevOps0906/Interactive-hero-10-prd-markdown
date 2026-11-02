import type { QualityTier } from "@/lib/hero/performance";
import type { ServiceData, StepData, StepId, StepIcon } from "./types";

export const ACCENT = "#e0b252";
export const DEMO_LABEL = "DEMO · 데모 예시 데이터";

/** GLB 교체 지점: url 을 채우면 절차적 모델 대신 GLB 로드(README 의 모델 교체 가이드 참고). 외부 URL 금지. */
export const MODEL_ASSET = {
  url: null as string | null, // 예: "/models/legal-case-journey/journey.glb"
  unit: "m",
  upAxis: "Y",
  /** 교체 모델이 가져야 할 노드 이름 규칙 */
  nodes: {
    step: (id: StepId) => `step-${id}`,
    doc: (id: string) => `doc-${id}`,
  },
  clips: [] as string[],
};

export const POSTER_SRC = "/posters/legal-case-journey/poster.svg";

export const STEP_X: Record<StepId, number> = { intake: -3.3, review: -1.1, submit: 1.1, done: 3.3 };

export const CAMERA = {
  fov: 42,
  intro: { pos: [0, 6, 16] as const, target: [0, 0.4, 0.6] as const },
  overview: { pos: [0, 3.4, 10.5] as const, target: [0, 0.5, 0.8] as const },
  documents: { pos: [0, 2.6, 7.4] as const, target: [0, 0.8, 2.4] as const },
  step: (x: number) => ({ pos: [x * 0.85, 2.3, 6.4] as const, target: [x, 0.7, 0] as const }),
  introMs: 1400,
  /** 저프레임에서도 인트로를 끝내는 벽시계 데드라인 */
  introDeadlineMs: 2200,
  moveMs: 0.9,
};

export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; segments: number; environment: boolean }> = {
  low: { dpr: 1, segments: 16, environment: false },
  medium: { dpr: 1.5, segments: 28, environment: true },
  high: { dpr: 2, segments: 40, environment: true },
};

const STEP_META: { id: StepId; label: string; icon: StepIcon; requires: StepId[] }[] = [
  { id: "intake", label: "접수", icon: "folder", requires: [] },
  { id: "review", label: "검토", icon: "review", requires: ["intake"] },
  { id: "submit", label: "제출", icon: "building", requires: ["intake", "review"] },
  { id: "done", label: "완료", icon: "stamp", requires: ["submit"] },
];

function steps(summaries: [string, string, string, string]): StepData[] {
  return STEP_META.map((m, i) => ({ ...m, summary: summaries[i] }));
}

const NOTE_DURATION = "기간은 사안과 기관 사정에 따라 크게 달라질 수 있습니다. (데모 예시, 확정 아님)";
const NOTE_COST = "비용은 조건에 따라 달라지며 이 화면은 견적을 제시하지 않습니다. 상담에서 안내받으세요. (데모 예시)";

/** mockData: 실제 서비스에서는 ServiceAdapter 로 교체한다. */
export const MOCK_SERVICES: ServiceData[] = [
  {
    id: "inheritance",
    label: "상속등기",
    tagline: "상속 부동산의 명의 변경 절차를 한눈에 봅니다.",
    steps: steps([
      "상담 후 상속 관계와 대상 재산을 일반 정보 수준에서 확인합니다.",
      "서류의 누락·불일치 가능성을 담당자가 살펴봅니다.",
      "준비된 서류를 등기소에 제출하는 단계입니다.",
      "등기 처리 결과를 확인하고 서류를 전달받습니다.",
    ]),
    docs: [
      { id: "inh-family", name: "가족관계 증명 서류", desc: "상속인 관계를 확인하기 위한 일반 서류 묶음 예시입니다. 실제 필요 서류는 사안에 따라 다릅니다." },
      { id: "inh-id", name: "상속인 신분 서류", desc: "상속인 본인 확인을 위한 서류 예시입니다." },
      { id: "inh-register", name: "부동산 등기사항증명서", desc: "대상 부동산의 현재 권리 상태를 확인하는 문서 예시입니다." },
      { id: "inh-agree", name: "상속재산 분할 합의서", desc: "상속인 간 합의 내용을 정리하는 문서 예시이며, 해당되는 경우에만 필요합니다." },
    ],
    durationNote: NOTE_DURATION,
    costNote: NOTE_COST,
  },
  {
    id: "property",
    label: "부동산등기",
    tagline: "매매 등 소유권 이전 등기의 흐름을 단계별로 봅니다.",
    steps: steps([
      "거래 내용과 일정을 일반 정보 수준에서 접수합니다.",
      "계약서와 권리 관계 서류의 정합성을 담당자가 살펴봅니다.",
      "준비된 서류를 등기소에 제출하는 단계입니다.",
      "등기 처리 결과를 확인하고 서류를 전달받습니다.",
    ]),
    docs: [
      { id: "prop-contract", name: "매매계약서", desc: "거래 조건을 담은 계약 문서 예시입니다." },
      { id: "prop-title", name: "등기 권리 증빙", desc: "현재 소유자의 권리를 확인하는 증빙 예시입니다." },
      { id: "prop-id", name: "신분·인감 관련 서류", desc: "거래 당사자 확인을 위한 서류 예시입니다." },
      { id: "prop-ledger", name: "토지·건축물대장", desc: "대상 부동산의 공부상 현황을 보여주는 서류 예시입니다." },
    ],
    durationNote: NOTE_DURATION,
    costNote: NOTE_COST,
  },
  {
    id: "corporation",
    label: "법인설립",
    tagline: "법인 설립 등기까지의 준비와 절차를 살펴봅니다.",
    steps: steps([
      "설립 형태와 일정을 일반 정보 수준에서 접수합니다.",
      "정관과 임원 구성 서류를 담당자가 살펴봅니다.",
      "준비된 서류를 등기소에 제출하는 단계입니다.",
      "설립 등기 결과를 확인하고 서류를 전달받습니다.",
    ]),
    docs: [
      { id: "corp-articles", name: "정관", desc: "법인의 기본 규칙을 담는 문서 예시입니다." },
      { id: "corp-officers", name: "임원 신분 서류", desc: "임원 확인을 위한 서류 예시입니다." },
      { id: "corp-office", name: "본점 사용 증빙", desc: "본점 소재지 사용 권한을 보여주는 서류 예시입니다." },
      { id: "corp-capital", name: "자본금 납입 증빙", desc: "자본금 납입을 확인하는 서류 예시입니다." },
    ],
    durationNote: NOTE_DURATION,
    costNote: NOTE_COST,
  },
];

export const LEGAL_NOTICE =
  "이 화면은 절차 이해를 돕는 데모 안내이며 법률 상담·대리나 결과 보장이 아닙니다. 업무 범위와 법적 판단은 전문가 검토가 필요합니다.";
