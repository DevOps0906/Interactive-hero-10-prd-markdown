export type RegionId = "shoulder" | "spine" | "hip" | "knee";
export type LayerId = "skin" | "muscle" | "bone";
export type LayerValues = Record<LayerId, number>;
export type ViewMode = "skin" | "muscle" | "bone" | "all" | "custom";

export interface DoctorInfo {
  name: string;
  role: string;
  note: string;
}

export interface RegionData {
  /** 안정적 ID. 3D 메시 이름(`region-<id>`)과 HTML 패널이 같은 데이터를 쓴다. */
  id: RegionId;
  label: string;
  department: string;
  /** 예약 페이지로 넘기는 진료과 코드(증상 정보 없음) */
  departmentCode: string;
  /** 모델 로컬 좌표의 선택 마커 위치 */
  marker: [number, number, number];
  /** 카메라 포커스: 위치·주시점(거리 제한 안쪽) */
  focus: { position: [number, number, number]; target: [number, number, number] };
  summary: string;
  flow: string[];
  checkup: string;
  doctors: DoctorInfo[];
}

export type Phase = "loading" | "ready" | "fallback";

export type { QualityTier } from "@/lib/hero/performance";
