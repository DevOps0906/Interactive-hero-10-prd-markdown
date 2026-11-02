import type { QualityTier } from "@/lib/hero/performance";

export type SpaceId = "lobby" | "classroom-a" | "classroom-b" | "lab" | "studio";
export type ProgramId = "coding-basic" | "design-portfolio" | "exam-intensive";
export type ViewMode = "orbit" | "preset";
export type Vec3 = [number, number, number];

export interface Space {
  id: SpaceId;
  name: string;
  kind: string;
  capacity: number;
  facilities: string[];
  summary: string;
  /** 바닥 중심(m). */
  position: Vec3;
  /** 가로(x)·세로(z) (m). */
  size: [number, number];
  programIds: ProgramId[];
}

export interface Program {
  id: ProgramId;
  name: string;
  hours: string;
  audience: string;
  place: string;
  spaceIds: SpaceId[];
}

export interface ScheduleRow {
  day: string;
  time: string;
  title: string;
}

export interface JourneyStep {
  id: string;
  label: string;
  spaceId: SpaceId;
  text: string;
}

export interface CampusData {
  spaces: Space[];
  programs: Program[];
  schedule: Record<SpaceId, ScheduleRow[]>;
  journey: JourneyStep[];
}

/** 모든 수치·시간표는 데모 예시다. 실제 데이터는 CampusData 어댑터로 주입한다. */
export const DEMO_LABEL = "DEMO · 데모 예시 데이터";

export const DEMO_DATA: CampusData = {
  spaces: [
    {
      id: "lobby", name: "로비·상담 데스크", kind: "상담·안내", capacity: 20,
      facilities: ["상담 데스크", "대기 라운지", "시설 안내 월"],
      summary: "입학 상담과 시설 안내가 시작되는 공간입니다.",
      position: [0, 0, 3.9], size: [5.4, 3.2], programIds: [],
    },
    {
      id: "classroom-a", name: "강의실 A", kind: "이론 수업", capacity: 30,
      facilities: ["전자칠판", "개인 책상 30석", "프로젝터"],
      summary: "소규모 이론·문제풀이 수업에 쓰는 강의실입니다.",
      position: [-2.5, 0, 0], size: [3.6, 3.2], programIds: ["coding-basic", "exam-intensive"],
    },
    {
      id: "classroom-b", name: "강의실 B", kind: "대형 강의·발표", capacity: 48,
      facilities: ["단상", "음향 설비", "포트폴리오 발표 스크린"],
      summary: "대형 강의와 결과물 발표회에 쓰는 강의실입니다.",
      position: [2.5, 0, 0], size: [3.6, 3.2], programIds: ["design-portfolio", "exam-intensive"],
    },
    {
      id: "lab", name: "실습실", kind: "컴퓨터 실습", capacity: 24,
      facilities: ["실습용 PC 24대", "개인 모니터", "공용 작업대"],
      summary: "수강생이 직접 따라 하며 배우는 실습 공간입니다.",
      position: [-2.5, 0, -3.9], size: [3.6, 3.2], programIds: ["coding-basic"],
    },
    {
      id: "studio", name: "프로젝트 스튜디오", kind: "팀 프로젝트", capacity: 16,
      facilities: ["팀 작업 테이블", "화이트보드 벽", "촬영 코너"],
      summary: "팀 프로젝트와 포트폴리오 제작을 위한 공간입니다.",
      position: [2.5, 0, -3.9], size: [3.6, 3.2], programIds: ["design-portfolio"],
    },
  ],
  programs: [
    { id: "coding-basic", name: "코딩 기초 과정", hours: "주 2회 · 회당 2시간 · 12주", audience: "입문자(중학생~성인)", place: "실습실, 강의실 A", spaceIds: ["lab", "classroom-a"] },
    { id: "design-portfolio", name: "디자인 포트폴리오 과정", hours: "주 3회 · 회당 2.5시간 · 16주", audience: "전공 준비생·직무 전환자", place: "프로젝트 스튜디오, 강의실 B", spaceIds: ["studio", "classroom-b"] },
    { id: "exam-intensive", name: "입시 집중 과정", hours: "주 5회 · 회당 4시간 · 24주", audience: "수험생(고2~재수생)", place: "강의실 A, 강의실 B", spaceIds: ["classroom-a", "classroom-b"] },
  ],
  schedule: {
    lobby: [{ day: "월~금", time: "10:00-18:00", title: "입학·시설 상담" }, { day: "토", time: "10:00-14:00", title: "시설 투어(예약제)" }],
    "classroom-a": [{ day: "월·수", time: "19:00-21:00", title: "코딩 기초 이론" }, { day: "화·목", time: "18:00-22:00", title: "입시 집중반" }],
    "classroom-b": [{ day: "화·목", time: "19:00-21:30", title: "포트폴리오 리뷰" }, { day: "금", time: "18:00-22:00", title: "입시 집중반" }],
    lab: [{ day: "월·수", time: "17:00-19:00", title: "코딩 기초 실습" }, { day: "토", time: "10:00-12:00", title: "자율 실습" }],
    studio: [{ day: "월·수·금", time: "14:00-16:30", title: "팀 프로젝트" }, { day: "일", time: "13:00-17:00", title: "촬영·제작 데이" }],
  },
  journey: [
    { id: "counsel", label: "입학 상담", spaceId: "lobby", text: "목표와 일정을 상담하고 맞는 과정을 안내받습니다." },
    { id: "basic", label: "기초 실습", spaceId: "lab", text: "실습실에서 기초를 직접 손으로 익힙니다." },
    { id: "project", label: "프로젝트", spaceId: "studio", text: "팀과 함께 결과물을 만듭니다." },
    { id: "portfolio", label: "포트폴리오", spaceId: "classroom-b", text: "결과물을 발표하고 피드백을 받아 포트폴리오로 정리합니다." },
  ],
};

/** 가이드 투어 순서: 로비 → 강의실 → 실습실. */
export const TOUR_SEQUENCE: SpaceId[] = ["lobby", "classroom-a", "lab"];
export const TOUR_DWELL_MS = 3200;
export const ANIM_DEADLINE_MS = 2400;

export const OVERVIEW = { position: [0, 9.5, 12.5] as Vec3, target: [0, 0, 0] as Vec3 };
export const CAMERA = { fov: 42, minPolar: 0.25, maxPolar: 1.38 };

export function spaceShot(s: Space): { position: Vec3; target: Vec3 } {
  const [x, , z] = s.position;
  return { position: [x * 0.55, 3.6, z + 5.4], target: [x, 0.3, z] };
}

/** GLB 교체 지점. url 이 있으면 절차적 모델 대신 로드한다(외부 URL 금지, public/ 내 경로). */
export const MODEL_ASSET = {
  url: null as string | null,
  unit: "m",
  upAxis: "Y",
  /** 필수 노드 이름. 각 공간 루트는 `room-<SpaceId>`. */
  requiredNodes: ["room-lobby", "room-classroom-a", "room-classroom-b", "room-lab", "room-studio"],
  maxTriangles: 60000,
};

export const QUALITY_PRESETS: Record<QualityTier, { dpr: number; shadows: boolean; desks: boolean; environment: boolean; antialias: boolean }> = {
  low: { dpr: 1, shadows: false, desks: false, environment: false, antialias: false },
  medium: { dpr: 1.5, shadows: false, desks: true, environment: true, antialias: true },
  high: { dpr: 2, shadows: true, desks: true, environment: true, antialias: true },
};

export const VIEW_LABEL: Record<ViewMode, string> = { orbit: "자유 탐색(Orbit)", preset: "프리셋 이동(Walk)" };

/** 측정 이벤트(개인정보 제외). 외부 수집기는 window 'hero:event' 를 구독한다. */
export type HeroEventName = "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit";
export function track(name: HeroEventName, detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, hero: "academy-virtual-campus", ...detail } }));
}
