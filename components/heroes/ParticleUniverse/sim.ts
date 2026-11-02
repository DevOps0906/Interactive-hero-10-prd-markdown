import { Color, Plane, Vector2, Vector3, type Camera, type Group, type Raycaster } from "three";
import gsap from "gsap";
import { downgradeTier, type QualityTier } from "@/lib/hero/performance";
import {
  QUALITY_PRESETS,
  type HeroSettings,
  type HeroState,
  type HeroStats,
  type IntroRig,
  type PointerInput,
  type ShapeId,
} from "./config";
import { shapeWeights } from "./geometry";

// 프레임마다 바뀌는 uniform·three 객체 변경은 컴포넌트 밖 함수에 모아, React 렌더 규칙과 분리한다.

const ORIGIN = new Vector3(0, 0, 0);
const MORPH_SECONDS = 1.8;
const FORCE = 1.2;
const FIELD_RADIUS = 1.7;

export function createUniforms(shape: ShapeId) {
  const [x, y, z] = shapeWeights(shape);
  return {
    uTime: { value: 0 },
    uGather: { value: 0 },
    uMorphProgress: { value: 1 },
    uIntensity: { value: 1 },
    uPixelRatio: { value: 1 },
    uSize: { value: 2 },
    uForce: { value: 0 },
    uRadius: { value: FIELD_RADIUS },
    uShape: { value: new Vector3(x, y, z) },
    uMouse: { value: new Vector3(999, 999, 999) },
    uAccent: { value: new Color("#3fd0bd") },
  };
}
export type Uniforms = ReturnType<typeof createUniforms>;

export function snapShape(u: Uniforms, shape: ShapeId) {
  const [x, y, z] = shapeWeights(shape);
  u.uShape.value.set(x, y, z);
  u.uMorphProgress.value = 1;
}

export function setAccent(u: Uniforms, hex: string) {
  u.uAccent.value.set(hex);
}

/** 형태 가중치를 목표로 보간. 반환 함수는 정리(kill)용. */
export function startMorph(u: Uniforms, shape: ShapeId, onDone: () => void): () => void {
  const [x, y, z] = shapeWeights(shape);
  u.uMorphProgress.value = 0;
  const tl = gsap.timeline({ onComplete: onDone });
  tl.to(u.uShape.value, { x, y, z, duration: MORPH_SECONDS, ease: "power2.inOut" }, 0).to(
    u.uMorphProgress,
    { value: 1, duration: MORPH_SECONDS, ease: "none" },
    0,
  );
  return () => {
    tl.kill();
  };
}

export interface FrameScratch {
  v2: Vector2;
  plane: Plane;
  dir: Vector3;
  hit: Vector3;
}

interface FrameArgs {
  u: Uniforms;
  tmp: FrameScratch;
  state: {
    camera: Camera;
    raycaster: Raycaster;
    gl: { domElement: HTMLCanvasElement; getPixelRatio: () => number };
    size: { width: number; height: number };
  };
  rawDelta: number;
  settings: HeroSettings;
  reduced: boolean;
  tier: QualityTier;
  stage: HeroState;
  pointer: PointerInput;
  rig: IntroRig;
  group: Group | null;
  field: { current: number };
  monitor: { acc: number; frames: number; windows: number };
  touchSet: { current: boolean };
  count: number;
}

/** 프레임 갱신. 1초 창이 끝나면 통계(와 필요 시 등급 하향)를 반환한다. */
export function stepFrame(a: FrameArgs): { stats: HeroStats; downgrade?: QualityTier } | null {
  const { u, tmp, state, settings: s, reduced, tier } = a;
  const { camera, gl } = state;
  const dt = Math.min(a.rawDelta, 0.1);
  const introPhase = a.stage === "loading" || a.stage === "intro";

  // OrbitControls가 터치 스크롤을 막지 않도록 세로 팬은 브라우저에 맡긴다(컨트롤 연결 이후 1회).
  if (!a.touchSet.current) {
    a.touchSet.current = true;
    gl.domElement.style.touchAction = "pan-y";
  }

  if (!reduced) u.uTime.value += dt * s.speed;
  u.uIntensity.value = s.intensity;
  u.uPixelRatio.value = gl.getPixelRatio();
  u.uSize.value = QUALITY_PRESETS[tier].pointSize;
  u.uGather.value = a.rig.gather;

  if (introPhase) camera.position.setLength(a.rig.camZ);

  // 좁은 화면에서는 구가 잘리지 않게 축소
  const aspect = state.size.width / Math.max(state.size.height, 1);
  const fit = Math.min(1, Math.max(0.5, aspect * 1.15));
  a.group?.scale.setScalar(fit);

  // 커서 Ray ∩ 카메라를 향한 가상 평면 → 월드 좌표 → 반발/인력 필드
  const p = a.pointer;
  const wantField = p.inside && !p.down && !reduced && !introPhase;
  a.field.current += ((wantField ? 1 : 0) - a.field.current) * Math.min(1, dt * 6);
  camera.getWorldDirection(tmp.dir);
  tmp.plane.setFromNormalAndCoplanarPoint(tmp.dir, ORIGIN);
  state.raycaster.setFromCamera(tmp.v2.set(p.x, p.y), camera);
  if (p.inside && state.raycaster.ray.intersectPlane(tmp.plane, tmp.hit)) {
    if (a.field.current < 0.05) u.uMouse.value.copy(tmp.hit);
    else u.uMouse.value.lerp(tmp.hit, 1 - Math.exp(-dt * 14));
  }
  u.uForce.value = (s.field === "repel" ? 1 : -1) * FORCE * a.field.current;
  u.uRadius.value = FIELD_RADIUS * fit;

  // 프레임 시간 모니터: 1초 창 평균이 예산을 넘으면 등급을 낮춘다(처음 2창은 셰이더 컴파일 등으로 무시).
  if (reduced) return null;
  const m = a.monitor;
  m.acc += Math.min(a.rawDelta, 0.25);
  m.frames += 1;
  if (m.acc < 1) return null;
  const fps = m.frames / m.acc;
  m.windows += 1;
  m.acc = 0;
  m.frames = 0;
  const stats: HeroStats = { fps, count: a.count, dpr: gl.getPixelRatio(), tier };
  if (m.windows > 2 && !introPhase && s.quality === "auto") {
    const budget = window.innerWidth < 768 ? 34 : 20;
    const next = downgradeTier(tier, 1000 / fps, budget);
    if (next !== tier) return { stats, downgrade: next };
  }
  return { stats };
}
