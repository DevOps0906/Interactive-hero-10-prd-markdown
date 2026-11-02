import type { QualityTier } from "@/lib/hero/performance";

export type PartId = "base" | "board" | "driver" | "shell" | "ring" | "cap";
export type Vec3 = [number, number, number];
export type MaterialRole = "finish" | "dark" | "glow";

export interface PartSpec {
  id: PartId;
  /** 표시 이름 (판매 옵션·BOM 명칭과 일치시킬 것) */
  name: string;
  /** GLB 교체 시 이 이름의 노드를 부품으로 인식한다 (명명 규칙) */
  node: string;
  role: MaterialRole;
  position: Vec3;
  /** exploded view에서 기본 위치로부터 이동할 거리 */
  explode: Vec3;
  /** 핫스팟 앵커(부품 로컬 오프셋)와 바깥 방향 법선(가림 판정용) */
  hotspot: { offset: Vec3; normal: Vec3 };
  summary: string;
  rows: Array<[string, string]>;
}

export interface FinishOption {
  id: string;
  label: string;
  sku: string;
  price: string;
  color: string;
  roughness: number;
  metalness: number;
}

export interface ProductData {
  name: string;
  tagline: string;
  accent: string;
  finishes: FinishOption[];
  parts: PartSpec[];
}

/**
 * GLB 교체 지점. url에 압축 GLB 경로(예: "/heroes/3d-product-experience/product.glb")를 넣으면
 * 절차적 모델 대신 로드한다. 노드 이름은 PartSpec.node 와 일치해야 하며, 로드 실패 시 절차적 모델로 폴백한다.
 * 압축 예: `npx gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`
 */
export const MODEL_ASSET: { url: string | null } = { url: null };

export const DEFAULT_PRODUCT: ProductData = {
  name: "Aurora One",
  tagline: "360° 공간 오디오 스피커",
  accent: "#3fd0bd",
  finishes: [
    { id: "graphite", label: "그래파이트", sku: "AO-GR", price: "249,000원", color: "#5b6573", roughness: 0.42, metalness: 0.6 },
    { id: "silver", label: "실버", sku: "AO-SV", price: "249,000원", color: "#c9ced6", roughness: 0.28, metalness: 0.95 },
    { id: "teal", label: "미드나잇 틸", sku: "AO-TL", price: "259,000원", color: "#1f8f99", roughness: 0.35, metalness: 0.55 },
    { id: "sand", label: "샌드", sku: "AO-SD", price: "259,000원", color: "#c8b49a", roughness: 0.6, metalness: 0.25 },
  ],
  parts: [
    {
      id: "cap", name: "상단 터치 캡", node: "Part_Cap", role: "dark", position: [0, 1.0, 0], explode: [0, 2.6, 0],
      hotspot: { offset: [0, 0.2, 0], normal: [0, 1, 0] },
      summary: "정전식 터치 컨트롤과 상태 LED가 있는 상단 캡.",
      rows: [["재질", "강화 글라스"], ["기능", "재생·볼륨·음소거"], ["LED", "RGB 상태 링"]],
    },
    {
      id: "ring", name: "라이트 링", node: "Part_Ring", role: "glow", position: [0, 0.95, 0], explode: [0, 1.9, 0],
      hotspot: { offset: [1.0, 0, 0], normal: [1, 0, 0] },
      summary: "연결·배터리 상태를 보여주는 발광 링.",
      rows: [["광원", "저전력 LED"], ["표시", "페어링 / 배터리 / 음소거"]],
    },
    {
      id: "shell", name: "알루미늄 쉘", node: "Part_Shell", role: "finish", position: [0, 0, 0], explode: [0, 1.2, 0],
      hotspot: { offset: [0.9, 0.3, 0.5], normal: [0.87, 0, 0.5] },
      summary: "CNC 가공 알루미늄 외피. 색상·거칠기 옵션이 적용되는 부품.",
      rows: [["재질", "6063 알루미늄"], ["마감", "아노다이징"], ["옵션", "4색"]],
    },
    {
      id: "driver", name: "풀레인지 드라이버", node: "Part_Driver", role: "dark", position: [0, 0.1, 0], explode: [0, 0, 0],
      hotspot: { offset: [0, 0.35, 0], normal: [0, 1, 0] },
      summary: "360° 방사형 음향을 만드는 메인 드라이버.",
      rows: [["구경", "75 mm"], ["주파수", "55 Hz – 20 kHz"], ["출력", "30 W"]],
    },
    {
      id: "board", name: "메인보드", node: "Part_Board", role: "glow", position: [0, -0.55, 0], explode: [0, -0.7, 0],
      hotspot: { offset: [0.6, 0, 0], normal: [1, 0, 0] },
      summary: "블루투스 5.4와 DSP를 담당하는 메인보드.",
      rows: [["무선", "Bluetooth 5.4"], ["DSP", "공간 오디오 보정"], ["배터리", "최대 18시간"]],
    },
    {
      id: "base", name: "고무 베이스", node: "Part_Base", role: "dark", position: [0, -1.0, 0], explode: [0, -1.4, 0],
      hotspot: { offset: [1.1, 0, 0], normal: [1, 0, 0] },
      summary: "진동을 흡수하는 논슬립 베이스.",
      rows: [["재질", "실리콘 고무"], ["기능", "미끄럼·진동 방지"]],
    },
  ],
};

export interface QualityPreset {
  dpr: number;
  segments: number;
  environment: boolean;
  shadows: boolean;
  label: string;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: { dpr: 1, segments: 24, environment: false, shadows: false, label: "낮음" },
  medium: { dpr: 1.5, segments: 48, environment: true, shadows: false, label: "중간" },
  high: { dpr: 2, segments: 96, environment: true, shadows: true, label: "높음" },
};

export const CAMERA = {
  intro: [0, 0.8, 13] as Vec3,
  home: [3.4, 1.8, 6.6] as Vec3,
  fov: 38,
  minDistance: 4,
  maxDistance: 11,
  introDuration: 2.4,
  autoRotateSpeed: 0.8,
};

export const HERO_DEFAULTS = { speed: 1, intensity: 1 };
