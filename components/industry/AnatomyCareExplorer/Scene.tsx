"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { ACCENT, CAMERA, MODEL_ASSET, QUALITY_PRESETS, getRegion, mockRegions } from "./config";
import type { ExplorerActions, ExplorerState } from "./useExplorer";
import type { LayerId, RegionData } from "./types";

/** 모델 루트의 세로 보정(발끝~머리 중심을 원점 근처로). */
const ROOT_Y = 0.2;
const noRaycast = () => null;

export interface SceneProps {
  state: ExplorerState;
  actions: ExplorerActions;
  reduced: boolean;
  tier: QualityTier;
  active: boolean;
  fpsRef: MutableRefObject<number>;
}

type Mats = Record<LayerId, THREE.MeshStandardMaterial>;
type GroupRef = MutableRefObject<THREE.Group | null>;
interface PoseRefs {
  arm: GroupRef;
  shin: GroupRef;
}

class Boundary extends Component<{ children: ReactNode; fallback?: ReactNode; onError?: (m: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError?.(error instanceof Error ? error.message : "3D 렌더링 오류");
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

// ───────── 절차적 인체 모델 (레이어별 skin/muscle/bone). 메시 이름: <layer>_<부위> ─────────
interface PartProps {
  kind: LayerId;
  mats: Mats;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  name?: string;
  children: ReactNode;
}
function Part({ kind, mats, children, ...rest }: PartProps) {
  return (
    <mesh {...rest} material={mats[kind]} raycast={noRaycast}>
      {children}
    </mesh>
  );
}

function Arm({ side, mats, seg, pose }: { side: 1 | -1; mats: Mats; seg: number; pose?: GroupRef }) {
  const n = side === 1 ? "r" : "l";
  return (
    <group ref={pose} position={[0.58 * side, 1.05, 0]} name={`arm_${n}`}>
      <Part kind="skin" mats={mats} name={`skin_upperarm_${n}`} position={[0, -0.375, 0]}><capsuleGeometry args={[0.1, 0.55, 6, seg]} /></Part>
      <Part kind="muscle" mats={mats} name={`muscle_upperarm_${n}`} position={[0, -0.375, 0]}><capsuleGeometry args={[0.078, 0.55, 6, seg]} /></Part>
      <Part kind="bone" mats={mats} name={`bone_humerus_${n}`} position={[0, -0.375, 0]}><cylinderGeometry args={[0.032, 0.032, 0.75, 8]} /></Part>
      <Part kind="muscle" mats={mats} name={`muscle_deltoid_${n}`} position={[0, -0.05, 0]}><sphereGeometry args={[0.16, seg, 12]} /></Part>
      <Part kind="bone" mats={mats} name={`bone_shoulder_joint_${n}`}><sphereGeometry args={[0.07, 12, 10]} /></Part>
      <group position={[0, -0.75, 0]}>
        <Part kind="skin" mats={mats} name={`skin_forearm_${n}`} position={[0, -0.35, 0]}><capsuleGeometry args={[0.08, 0.54, 6, seg]} /></Part>
        <Part kind="muscle" mats={mats} name={`muscle_forearm_${n}`} position={[0, -0.35, 0]}><capsuleGeometry args={[0.062, 0.54, 6, seg]} /></Part>
        <Part kind="bone" mats={mats} name={`bone_radius_${n}`} position={[0, -0.35, 0]}><cylinderGeometry args={[0.026, 0.026, 0.7, 8]} /></Part>
        <Part kind="skin" mats={mats} name={`skin_hand_${n}`} position={[0, -0.78, 0]}><sphereGeometry args={[0.09, 12, 10]} /></Part>
      </group>
    </group>
  );
}

function Leg({ side, mats, seg, shinRef }: { side: 1 | -1; mats: Mats; seg: number; shinRef?: GroupRef }) {
  const n = side === 1 ? "r" : "l";
  return (
    <group position={[0.3 * side, -0.3, 0]} name={`leg_${n}`}>
      <Part kind="skin" mats={mats} name={`skin_thigh_${n}`} position={[0, -0.55, 0]}><capsuleGeometry args={[0.17, 0.76, 6, seg]} /></Part>
      <Part kind="muscle" mats={mats} name={`muscle_thigh_${n}`} position={[0, -0.55, 0]}><capsuleGeometry args={[0.14, 0.76, 6, seg]} /></Part>
      <Part kind="bone" mats={mats} name={`bone_femur_${n}`} position={[0, -0.55, 0]}><cylinderGeometry args={[0.04, 0.04, 1.1, 8]} /></Part>
      <Part kind="bone" mats={mats} name={`bone_hip_joint_${n}`}><sphereGeometry args={[0.09, 12, 10]} /></Part>
      <group ref={shinRef} position={[0, -1.1, 0]}>
        <Part kind="bone" mats={mats} name={`bone_knee_joint_${n}`}><sphereGeometry args={[0.075, 12, 10]} /></Part>
        <Part kind="skin" mats={mats} name={`skin_shin_${n}`} position={[0, -0.55, 0]}><capsuleGeometry args={[0.12, 0.86, 6, seg]} /></Part>
        <Part kind="muscle" mats={mats} name={`muscle_shin_${n}`} position={[0, -0.55, 0]}><capsuleGeometry args={[0.095, 0.86, 6, seg]} /></Part>
        <Part kind="bone" mats={mats} name={`bone_tibia_${n}`} position={[0, -0.55, 0]}><cylinderGeometry args={[0.032, 0.032, 1.1, 8]} /></Part>
      </group>
    </group>
  );
}

function ProceduralBody({ mats, seg, pose }: { mats: Mats; seg: number; pose: PoseRefs }) {
  return (
    <>
      <Part kind="skin" mats={mats} name="skin_torso" position={[0, 0.5, 0]} scale={[1, 1, 0.65]}><capsuleGeometry args={[0.4, 0.9, 8, seg]} /></Part>
      <Part kind="muscle" mats={mats} name="muscle_torso" position={[0, 0.5, 0]} scale={[1, 1, 0.62]}><capsuleGeometry args={[0.34, 0.9, 8, seg]} /></Part>
      <Part kind="skin" mats={mats} name="skin_neck" position={[0, 1.5, 0]}><cylinderGeometry args={[0.11, 0.12, 0.3, seg]} /></Part>
      <Part kind="muscle" mats={mats} name="muscle_neck" position={[0, 1.5, 0]}><cylinderGeometry args={[0.085, 0.095, 0.3, seg]} /></Part>
      <Part kind="skin" mats={mats} name="skin_head" position={[0, 1.8, 0]}><sphereGeometry args={[0.27, seg, 16]} /></Part>
      <Part kind="bone" mats={mats} name="bone_skull" position={[0, 1.8, 0]}><sphereGeometry args={[0.2, 16, 12]} /></Part>
      {Array.from({ length: 10 }, (_, i) => (
        <Part key={i} kind="bone" mats={mats} name={`bone_vertebra_${i}`} position={[0, 1.35 - i * 0.16, -0.12]}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </Part>
      ))}
      {[1.05, 0.85, 0.65, 0.45].map((y, i) => (
        <Part key={y} kind="bone" mats={mats} name={`bone_rib_${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.62, 1]}>
          <torusGeometry args={[0.3 - i * 0.015, 0.018, 8, seg]} />
        </Part>
      ))}
      <Part kind="bone" mats={mats} name="bone_clavicle" position={[0, 1.22, 0.04]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.028, 0.028, 1.1, 8]} /></Part>
      <Part kind="bone" mats={mats} name="bone_pelvis" position={[0, -0.22, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.65, 1]}><torusGeometry args={[0.32, 0.05, 8, seg]} /></Part>
      <Arm side={1} mats={mats} seg={seg} pose={pose.arm} />
      <Arm side={-1} mats={mats} seg={seg} />
      <Leg side={1} mats={mats} seg={seg} shinRef={pose.shin} />
      <Leg side={-1} mats={mats} seg={seg} />
    </>
  );
}

/** GLB: 노드 이름 접두어(skin_/muscle_/bone_)로 레이어 재질을 연결한다. */
function GlbBody({ url, mats, onLoaded }: { url: string; mats: Mats; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const kind = (["skin", "muscle", "bone"] as const).find((k) => mesh.name.startsWith(`${k}_`));
      if (kind) mesh.material = mats[kind];
      mesh.raycast = noRaycast;
    });
    onLoaded();
  }, [root, mats, onLoaded]);
  return <primitive object={root} />;
}

// ───────── 선택 마커 (3D Mesh ID: region-<id>) ─────────
function Marker({ region, selected, onSelect, reduced }: { region: RegionData; selected: boolean; onSelect: (id: RegionData["id"]) => void; reduced: boolean }) {
  const dot = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!dot.current) return;
    dot.current.scale.setScalar(selected ? 1.5 : reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 3) * 0.12);
  });
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(region.id);
  };
  return (
    <group position={region.marker} name={`region-${region.id}`}>
      <mesh ref={dot} renderOrder={10} raycast={noRaycast}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshBasicMaterial color={selected ? "#ffffff" : ACCENT} depthTest={false} toneMapped={false} />
      </mesh>
      {/* 터치 대상 확대용 투명 히트 영역 */}
      <mesh onClick={handle} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function applyOpacity(m: THREE.Material, target: number, instant: boolean, delta: number) {
  m.opacity = instant ? target : THREE.MathUtils.damp(m.opacity, target, 8, delta);
  m.visible = m.opacity > 0.01;
  m.depthWrite = m.opacity > 0.9;
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier, fpsRef }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, size, invalidate } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const armRef = useRef<THREE.Group>(null);
  const shinRef = useRef<THREE.Group>(null);
  const pose: PoseRefs = { arm: armRef, shin: shinRef };
  const poseK = useRef(0);
  const root = useRef<THREE.Group>(null);
  const frames = useRef({ sum: 0, n: 0 });
  const [touched, setTouched] = useState(false);

  const mats: Mats = useMemo(() => {
    const make = (color: string, roughness: number) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05, transparent: true, side: THREE.DoubleSide });
    return { skin: make("#8497b3", 0.6), muscle: make("#c0707a", 0.55), bone: make("#e9e3d2", 0.5) };
  }, []);
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  const glbUrl = MODEL_ASSET.url;
  const { ready, setAnimating, select } = actions;
  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);

  useEffect(() => {
    root.current?.scale.setScalar(THREE.MathUtils.clamp((size.width / size.height) * 1.15, 0.65, 1.05));
  }, [size.width, size.height]);

  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // Camera Focus: 선택 부위/초기 시점으로 이동. 빠른 연타 시 이전 트윈은 취소하고 마지막 목표만 유지.
  const selectedId = state.selectedId;
  const focusN = state.focusN;
  useEffect(() => {
    const ctl = controls.current;
    if (!ctl) return;
    const region = getRegion(selectedId);
    const to = region ? region.focus.position : CAMERA.home;
    const tgt = region ? region.focus.target : CAMERA.target;
    const dur = reduced ? 0 : CAMERA.focusDuration;
    const finish = () => {
      camera.position.set(to[0], to[1] + ROOT_Y, to[2]);
      ctl.target.set(tgt[0], tgt[1] + ROOT_Y, tgt[2]);
      ctl.update();
      invalidate();
      setAnimating(false);
    };
    if (dur === 0) {
      finish();
      return;
    }
    setAnimating(true);
    const tl = gsap
      .timeline({ onComplete: () => setAnimating(false), defaults: { duration: dur, ease: "power3.inOut" } })
      .to(camera.position, { x: to[0], y: to[1] + ROOT_Y, z: to[2] }, 0)
      .to(ctl.target, { x: tgt[0], y: tgt[1] + ROOT_Y, z: tgt[2] }, 0);
    // 백그라운드 탭 저프레임에서도 벽시계 기준으로 끝낸다.
    const timer = window.setTimeout(() => {
      tl.kill();
      finish();
    }, dur * 1000 + 400);
    return () => {
      tl.kill();
      window.clearTimeout(timer);
    };
  }, [selectedId, focusN, reduced, camera, invalidate, setAnimating]);

  const layers = state.layers;
  const motion = state.motion;
  useFrame((st, delta) => {
    // Layer Transparency
    for (const k of ["skin", "muscle", "bone"] as const) {
      applyOpacity(mats[k], layers[k], reduced, delta);
    }
    // Neutral Motion Demo: 일반적인 관절 움직임(진단 시뮬레이션 아님). reduced 이면 정적 자세.
    const target = motion ? 1 : 0;
    poseK.current = reduced ? target : THREE.MathUtils.damp(poseK.current, target, 6, delta);
    const wave = reduced ? 0.6 : 0.5 - 0.5 * Math.cos(st.clock.elapsedTime * 1.6);
    if (armRef.current) armRef.current.rotation.z = poseK.current * wave * 1.2;
    if (shinRef.current) shinRef.current.rotation.x = poseK.current * wave * 0.9;
    // 프레임 시간 모니터 → 자동 품질 하향
    if (state.phase === "ready" && delta < 0.25) {
      frames.current.sum += delta * 1000;
      frames.current.n++;
      if (frames.current.n >= 60) {
        const avg = frames.current.sum / frames.current.n;
        fpsRef.current = 1000 / avg;
        const next = downgradeTier(tier, avg, 22);
        if (next !== tier) actions.downgrade(next);
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  const autoRotate = !reduced && !touched && state.phase === "ready" && selectedId === null && !motion;

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#a9bbd8", "#1a2030", 0.9]} />
      <directionalLight position={[4, 6, 5]} intensity={2.4} />
      <directionalLight position={[-4, 2, -4]} color={ACCENT} intensity={1.4} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={0.9}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <group ref={root} position={[0, ROOT_Y, 0]}>
        <Boundary onError={ready} fallback={<ProceduralBody mats={mats} seg={quality.segments} pose={pose} />}>
          <Suspense fallback={null}>
            {glbUrl ? <GlbBody url={glbUrl} mats={mats} onLoaded={ready} /> : <ProceduralBody mats={mats} seg={quality.segments} pose={pose} />}
          </Suspense>
        </Boundary>
        {mockRegions.map((r) => (
          <Marker key={r.id} region={r} selected={selectedId === r.id} onSelect={select} reduced={reduced} />
        ))}
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
        autoRotate={autoRotate}
        autoRotateSpeed={CAMERA.autoRotateSpeed}
        onStart={() => setTouched(true)}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  return (
    <Boundary onError={props.actions.fail}>
      <Canvas
        frameloop={props.active ? "always" : "never"}
        dpr={clampDpr(preset.dpr)}
        camera={{ position: CAMERA.home, fov: CAMERA.fov, near: 0.1, far: 60 }}
        gl={{ antialias: props.tier !== "low", alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            props.actions.fail("WebGL 컨텍스트가 손실되었습니다.");
          });
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </Boundary>
  );
}
