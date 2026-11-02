"use client";

import { Component, useEffect, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clampDpr, type QualityTier } from "@/lib/hero/performance";
import { HERO_TOKENS, TIER_PRESETS, type LiveValues, type PointerState, type Settings } from "./config";
import { BLOB_FRAG, BLOB_VERT, META_FRAG, META_VERT } from "./shaders";

export type SceneProps = {
  live: RefObject<LiveValues>;
  pointer: RefObject<PointerState>;
  scroll: RefObject<{ progress: number }>;
  settings: Settings;
  tier: QualityTier;
  reduced: boolean;
  tick: number;
  onReady: () => void;
  onFps: (fps: number, ms: number) => void;
  onError: () => void;
};

const FOV = 40;
const subscribeVisibility = (cb: () => void) => {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
};

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Rig = ReturnType<typeof createRig>;

function createRig(accent: string) {
  const shared = {
    uTime: { value: 0 },
    uNoise: { value: 0.3 },
    uScale: { value: 1 },
    uMorph: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uPress: { value: 0 },
    uIrid: { value: 0.7 },
    uIntensity: { value: 1 },
    uColorA: { value: new THREE.Color(accent) },
    uColorB: { value: new THREE.Color(HERO_TOKENS.secondary) },
    uColorMix: { value: 0 },
  };
  const blobMat = new THREE.ShaderMaterial({
    vertexShader: BLOB_VERT,
    fragmentShader: BLOB_FRAG,
    uniforms: { ...shared, uPointerStrength: { value: 0 } },
  });
  const metaMat = new THREE.ShaderMaterial({
    vertexShader: META_VERT,
    fragmentShader: META_FRAG,
    transparent: true,
    depthTest: false,
    uniforms: { ...shared, uAspect: { value: 1 }, uCamZ: { value: 4 }, uPointerOn: { value: 1 }, uSteps: { value: 40 }, uBalls: { value: 4 } },
  });
  return {
    shared,
    blobMat,
    metaMat,
    raycaster: new THREE.Raycaster(),
    plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    hit: new THREE.Vector3(),
    ndc: new THREE.Vector2(),
    sm: { x: 0, y: 0, act: 0, sp: 0, t: 0 },
    fps: { n: 0, sum: 0 },
    accent,
  };
}

type FrameArgs = Pick<SceneProps, "live" | "pointer" | "scroll" | "settings" | "reduced" | "onFps"> & {
  camera: THREE.Camera;
  size: { width: number; height: number };
  preset: (typeof TIER_PRESETS)[QualityTier];
};

// 프레임마다 uniform을 갱신한다(React 렌더 밖의 명령형 루프).
function stepFrame(r: Rig, a: FrameArgs, rawDt: number) {
  const dt = Math.min(rawDt, 0.05); // 탭 복귀 시 시간 점프 방지
  const { shared, sm: m } = r;
  const s = a.settings;
  const L = a.live.current;
  const p = a.pointer.current;
  const k = 1 - Math.exp(-dt * (a.reduced ? 60 : 8));

  // 인터랙션 5: 스크롤 진행도 → scale/noise/morph/camera
  const spTarget = s.scrollLink ? (s.scrollManual ? s.scrollValue : a.scroll.current.progress) : 0;
  m.sp += (spTarget - m.sp) * k;
  m.t += a.reduced ? 0 : dt * s.speed;
  const sp = m.sp;

  // 인터랙션 3: 포인터 → 카메라 레이 ↔ z=0 평면 교점
  const act = s.pointerOn && p.active && !a.reduced ? 1 : 0;
  m.act += (act - m.act) * k;
  if (act) {
    m.x += (p.x - m.x) * k;
    m.y += (p.y - m.y) * k;
  }
  const camZ = L.camZ + sp * 1.0;
  const cam = a.camera as THREE.PerspectiveCamera;
  cam.position.z = camZ;
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  r.ndc.set(m.x, m.y);
  r.raycaster.setFromCamera(r.ndc, cam);
  if (!r.raycaster.ray.intersectPlane(r.plane, r.hit)) r.hit.set(0, 0, 0);

  if (r.accent !== s.accent) {
    r.accent = s.accent;
    shared.uColorA.value.set(s.accent);
  }
  shared.uTime.value = m.t + 2;
  shared.uNoise.value = L.noise * (0.5 + 0.5 * s.intensity) * (1 + sp * 0.9);
  shared.uScale.value = L.scale * (1 - sp * 0.3);
  shared.uMorph.value = sp;
  shared.uPress.value = p.press;
  shared.uIrid.value = s.iridescence;
  shared.uIntensity.value = L.intensity * s.intensity;
  shared.uColorMix.value = L.colorMix;
  shared.uPointer.value.set(r.hit.x, r.hit.y);

  if (s.mode === "blob") {
    r.blobMat.uniforms.uPointerStrength.value = 0.55 * m.act;
  } else {
    shared.uPointer.value.set(m.x, m.y); // 메타볼은 NDC를 셰이더에서 월드로 변환
    const u = r.metaMat.uniforms;
    u.uAspect.value = a.size.width / Math.max(a.size.height, 1);
    u.uCamZ.value = camZ;
    u.uPointerOn.value = s.pointerOn ? 1 : 0;
    u.uSteps.value = a.preset.steps;
    u.uBalls.value = a.preset.balls;
  }

  // 인터랙션 7: 프레임 시간 측정(초기 30프레임은 셰이더 컴파일 구간이라 제외)
  if (!a.reduced) {
    const f = r.fps;
    f.n += 1;
    if (f.n > 30) f.sum += rawDt;
    if (f.n === 120) {
      const ms = (f.sum / 90) * 1000;
      a.onFps(Math.round(1000 / ms), ms);
      f.n = 30;
      f.sum = 0;
    }
  }
}

function Liquid({ live, pointer, scroll, settings, tier, reduced, tick, onReady, onFps, onError }: SceneProps) {
  const { gl, camera, size, invalidate } = useThree();
  const preset = TIER_PRESETS[tier];
  const [rig] = useState(() => createRig(settings.accent));

  // GPU 자원 해제
  useEffect(() => {
    return () => {
      rig.blobMat.dispose();
      rig.metaMat.dispose();
    };
  }, [rig]);

  // 렌더 시작 알림 + 컨텍스트 손실 시 폴백
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    canvas.addEventListener("webglcontextlost", lost);
    onReady();
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onReady, onError]);

  // reduced-motion(demand 루프)에서는 옵션·트윈 변경 때만 다시 그린다
  useEffect(() => {
    invalidate();
  }, [invalidate, settings, tier, tick, size]);

  useFrame((_, rawDt) => {
    stepFrame(rig, { live, pointer, scroll, settings, reduced, onFps, camera, size, preset }, rawDt);
  });

  return settings.mode === "blob" ? (
    <mesh key={`blob-${preset.detail}`}>
      <icosahedronGeometry args={[1, preset.detail]} />
      <primitive object={rig.blobMat} attach="material" />
    </mesh>
  ) : (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={rig.metaMat} attach="material" />
    </mesh>
  );
}

export default function Scene(props: SceneProps) {
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "hidden",
    () => false,
  );
  const preset = TIER_PRESETS[props.tier];
  return (
    <Boundary onError={props.onError}>
      <Canvas
        frameloop={props.reduced ? "demand" : hidden ? "never" : "always"}
        dpr={Math.min(clampDpr(preset.dprMax), preset.dprMax)}
        camera={{ position: [0, 0, 4], fov: FOV, near: 0.1, far: 50 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }}
      >
        <Liquid {...props} />
      </Canvas>
    </Boundary>
  );
}
