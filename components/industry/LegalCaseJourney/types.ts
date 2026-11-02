export type ServiceId = "inheritance" | "property" | "corporation";
export type StepId = "intake" | "review" | "submit" | "done";
export type StepIcon = "folder" | "review" | "building" | "stamp";
export type ViewMode = "overview" | "process" | "documents";
export type Phase = "loading" | "intro" | "ready" | "fallback";

export interface StepData {
  id: StepId;
  label: string;
  icon: StepIcon;
  summary: string;
  /** 선행 단계 ID (Dependency Highlight 연결선의 근거) */
  requires: StepId[];
}

export interface DocData {
  id: string;
  name: string;
  /** 클릭 시 보이는 설명 (일반 안내, 법률 판단 아님) */
  desc: string;
}

export interface ServiceData {
  id: ServiceId;
  label: string;
  tagline: string;
  steps: StepData[];
  docs: DocData[];
  /** 데모 예시 문구 (확정 견적·기간 아님) */
  durationNote: string;
  costNote: string;
}

/** 외부 데이터(업무 안내·서류 목록) 주입 adapter. 데모는 MOCK_SERVICES 를 쓴다. */
export type ServiceAdapter = () => ServiceData[];

export interface Snapshot {
  selectedId: ServiceId;
  stepIndex: number;
  viewMode: ViewMode;
}
