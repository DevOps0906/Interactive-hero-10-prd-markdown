"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clampDpr, downgradeTier } from "@/lib/hero/performance";
import {
  ARM, ASSET_CONTRACT, CAMERA, HOME_POSE, JOINTS, MODEL_ASSET, MODULE_IDS, PARTS, PART_BY_ID, QUALITY_PRESETS, VIEWS,
  type ModuleId, type PartId, type Pose,
} from "./config";
import { INTRO_MS, type LabActions, type LabState } from "./useLab";
import styles from "./RobotLearningLab.module.css";

const ACCENT = "#3fd0bd";
const rad = (d: number) => (d * Math.PI) / 180;

interface Rig {
  joints: Partial<Record<ModuleId, THREE.Object3D>>;
  parts: Partial<Record<PartId, { obj: THREE.Object3D; base: THREE.Vector3 }>>;
  fingers: { obj: THREE.Object3D; base: number; dir: number }[];
}
type RigRef = MutableRefObject<Rig>;
const emptyRig = (): Rig => ({ joints: {}, parts: {}, fingers: [] });

export interface SceneProps {
  state: LabState;
  pose: Pose;
  reached: boolean;
  actions: LabActions;
  fpsRef: MutableRefObject<number>;
}

// ───────── 에러 경계 ─────────
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

// ───────── 절차적 로봇 (GLB 자산이 없을 때) ─────────
type Mats = Record<PartId, THREE.MeshStandardMaterial>;
const KIND_COLOR = { base: "#5a6478", motor: "#4a5a74", link: "#a3adbf", sensor: "#2f6f69" } as const;

function makeMats(): Mats {
  const out = {} as Mats;
  for (const p of PARTS) {
    out[p.id] = new THREE.MeshStandardMaterial({
      color: KIND_COLOR[p.kind], roughness: 0.45, metalness: 0.2, emissive: ACCENT, emissiveIntensity: p.kind === "sensor" ? 0.5 : 0,
    });
  }
  return out;
}

function ProceduralRobot({ rig, mats, segments }: { rig: RigRef; mats: Mats; segments: number }) {
  const joint = (id: ModuleId) => (o: THREE.Object3D | null) => {
    if (o) rig.current.joints[id] = o;
  };
  const part = (id: PartId) => (o: THREE.Object3D | null) => {
    if (o && rig.current.parts[id]?.obj !== o) rig.current.parts[id] = { obj: o, base: o.position.clone() };
  };
  const finger = (i: number, dir: number) => (o: THREE.Object3D | null) => {
    if (o) rig.current.fingers[i] = { obj: o, base: Math.abs(o.position.z), dir };
  };
  const { l1, l2, baseHeight } = ARM;
  return (
    <>
      <group ref={part("base-plate")} name="part_base_plate">
        <mesh position={[0, 0.11, 0]} castShadow receiveShadow material={mats["base-plate"]}>
          <cylinderGeometry args={[0.85, 0.9, 0.22, segments]} />
        </mesh>
      </group>
      <group ref={joint("base")} name="joint_base">
        <group ref={part("base-motor")} name="part_base_motor">
          <mesh position={[0, 0.41, 0]} castShadow material={mats["base-motor"]}>
            <cylinderGeometry args={[0.45, 0.5, 0.38, segments]} />
          </mesh>
        </group>
        <group ref={joint("shoulder")} name="joint_shoulder" position={[0, baseHeight, 0]}>
          <group ref={part("shoulder-motor")} name="part_shoulder_motor">
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats["shoulder-motor"]}>
              <cylinderGeometry args={[0.3, 0.3, 0.6, segments]} />
            </mesh>
          </group>
          <group ref={part("shoulder-link")} name="part_shoulder_link">
            <mesh position={[0, l1 / 2, 0]} castShadow material={mats["shoulder-link"]}>
              <boxGeometry args={[0.22, l1, 0.22]} />
            </mesh>
          </group>
          <group ref={joint("elbow")} name="joint_elbow" position={[0, l1, 0]}>
            <group ref={part("elbow-motor")} name="part_elbow_motor">
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats["elbow-motor"]}>
                <cylinderGeometry args={[0.26, 0.26, 0.5, segments]} />
              </mesh>
            </group>
            <group ref={part("elbow-link")} name="part_elbow_link">
              <mesh position={[0, l2 / 2, 0]} castShadow material={mats["elbow-link"]}>
                <boxGeometry args={[0.18, l2, 0.18]} />
              </mesh>
            </group>
            <group ref={joint("wrist")} name="joint_wrist" position={[0, l2, 0]}>
              <group ref={part("wrist-motor")} name="part_wrist_motor">
                <mesh rotation={[Math.PI / 2, 0, 0]} castShadow material={mats["wrist-motor"]}>
                  <cylinderGeometry args={[0.2, 0.2, 0.4, segments]} />
                </mesh>
              </group>
              <group ref={part("wrist-imu")} name="part_wrist_imu" position={[0, 0.1, 0.3]}>
                <mesh material={mats["wrist-imu"]}>
                  <boxGeometry args={[0.18, 0.1, 0.18]} />
                </mesh>
              </group>
              <group ref={joint("gripper")} name="joint_gripper" position={[0, 0.1, 0]}>
                <group ref={part("grip-hand")} name="part_grip_hand">
                  <mesh position={[0, 0.08, 0]} castShadow material={mats["grip-hand"]}>
                    <boxGeometry args={[0.22, 0.16, 0.34]} />
                  </mesh>
                  <mesh ref={finger(0, 1)} name="finger_l" position={[0, 0.31, 0.05]} castShadow material={mats["grip-hand"]}>
                    <boxGeometry args={[0.07, 0.3, 0.06]} />
                  </mesh>
                  <mesh ref={finger(1, -1)} name="finger_r" position={[0, 0.31, -0.05]} castShadow material={mats["grip-hand"]}>
                    <boxGeometry args={[0.07, 0.3, 0.06]} />
                  </mesh>
                </group>
                <group ref={part("grip-cam")} name="part_grip_cam" position={[0.14, 0.1, 0]}>
                  <mesh rotation={[0, 0, Math.PI / 2]} material={mats["grip-cam"]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.06, segments]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </>
  );
}

/** GLB 로봇. ASSET_CONTRACT 의 노드가 하나라도 없으면 onInvalid 로 알리고 정지 화면(포스터)으로 폴백한다. */
function GlbRobot({ url, rigRef, onLoaded, onInvalid }: { url: string; rigRef: RigRef; onLoaded: () => void; onInvalid: (missing: string[]) => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    const names = [...ASSET_CONTRACT.joints, ...ASSET_CONTRACT.parts, ...ASSET_CONTRACT.fingers];
    const missing = names.filter((n) => !root.getObjectByName(n));
    if (missing.length) {
      onInvalid(missing);
      return;
    }
    const next = emptyRig();
    for (const j of JOINTS) next.joints[j.id] = root.getObjectByName(j.node)!;
    for (const p of PARTS) {
      const obj = root.getObjectByName(p.node)!;
      next.parts[p.id] = { obj, base: obj.position.clone() };
    }
    ASSET_CONTRACT.fingers.forEach((n, i) => {
      const obj = root.getObjectByName(n)!;
      next.fingers[i] = { obj, base: Math.abs(obj.position.z), dir: i === 0 ? 1 : -1 };
    });
    rigRef.current = next;
    onLoaded();
    return () => {
      rigRef.current = emptyRig();
    };
  }, [root, rigRef, onLoaded, onInvalid]);
  return <primitive object={root} />;
}

// ───────── 분해 라벨 (월드 좌표 추적) ─────────
const tmp = new THREE.Vector3();
function PartLabel({ id, rig, explodeT, active, onSelect }: { id: PartId; rig: RigRef; explodeT: MutableRefObject<number>; active: boolean; onSelect: (m: ModuleId) => void }) {
  const group = useRef<THREE.Group>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useFrame(() => {
    const entry = rig.current.parts[id];
    if (!group.current || !btn.current || !entry) return;
    entry.obj.getWorldPosition(tmp);
    group.current.position.copy(tmp);
    const show = explodeT.current > 0.85;
    btn.current.style.opacity = show ? "1" : "0";
    btn.current.style.pointerEvents = show ? "auto" : "none";
  });
  const spec = PART_BY_ID[id];
  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]}>
        {/* 스테이지는 aria-hidden: 키보드·스크린리더 경로는 패널의 부품 목록이다 */}
        <button ref={btn} type="button" tabIndex={-1} className={styles.partLabel} data-active={active} style={{ opacity: 0 }} onClick={() => onSelect(spec.module)}>
          {spec.name}
        </button>
      </Html>
    </group>
  );
}

// ───────── 장면 ─────────
function SceneContent({ state, pose, reached, actions, fpsRef }: SceneProps) {
  const quality = QUALITY_PRESETS[state.tier];
  const { camera, size } = useThree();
  const rig: RigRef = useRef(emptyRig());
  const robot = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const markerMat = useRef<THREE.MeshBasicMaterial>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const cur = useRef<Pose>({ ...HOME_POSE });
  const explodeT = useRef(0);
  const viewGoal = useRef<THREE.Vector3 | null>(null);
  const introT0 = useRef(0);
  const frames = useRef({ sum: 0, n: 0 });
  const latest = useRef({ state, pose, reached });
  const glbUrl = MODEL_ASSET.url;

  useEffect(() => {
    latest.current = { state, pose, reached };
  });

  const [mats] = useState(makeMats);
  const matsRef = useRef(mats);
  useEffect(() => () => Object.values(matsRef.current).forEach((m) => m.dispose()), []);

  // 절차적 모델은 마운트 즉시 준비 완료. GLB 는 로드 후 onLoaded
  const { ready, fail } = actions;
  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);
  const onInvalid = useMemo(() => (missing: string[]) => fail(`모델 노드 누락: ${missing.slice(0, 3).join(", ")}`), [fail]);

  // 좁은 화면에서 잘림 방지
  useEffect(() => {
    const s = THREE.MathUtils.clamp((size.width / size.height) * 1.15, 0.62, 1.05);
    robot.current?.scale.setScalar(s);
  }, [size.width, size.height]);

  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  const phase = state.phase;
  useEffect(() => {
    if (phase === "intro") introT0.current = performance.now();
  }, [phase]);

  // 시점 전환
  const { viewMode, reduced } = state;
  useEffect(() => {
    if (viewMode === "free") {
      viewGoal.current = null;
      return;
    }
    const v = VIEWS[viewMode];
    if (reduced) {
      camera.position.set(v[0], v[1], v[2]);
      viewGoal.current = null;
    } else viewGoal.current = new THREE.Vector3(v[0], v[1], v[2]);
  }, [viewMode, reduced, camera]);

  useFrame((_, delta) => {
    const { state: st, pose: goal } = latest.current;
    const r = rig.current;

    // 등장 연출(벽시계 기준)
    let k = 1;
    if (st.phase === "loading") k = 0;
    else if (st.phase === "intro" && !st.reduced) k = Math.min(1, (performance.now() - introT0.current) / INTRO_MS);
    const e = 1 - Math.pow(1 - k, 3);
    if (robot.current) {
      robot.current.visible = k > 0;
      robot.current.position.y = (1 - e) * -0.8;
      robot.current.rotation.y = (1 - e) * -Math.PI * 0.7;
    }

    // 관절 보간 (프레임 시간에 독립적인 감쇠)
    const rate = st.reduced ? 1 : 1 - Math.exp(-delta * 9);
    const c = cur.current;
    for (const id of MODULE_IDS) c[id] += (goal[id] - c[id]) * rate;
    for (const j of JOINTS) {
      const o = r.joints[j.id];
      if (!o) continue;
      if (j.axis === "y") o.rotation.y = rad(c[j.id]);
      else if (j.axis === "z") o.rotation.z = rad(c[j.id]) * j.sign;
    }
    const open = c.gripper / 100;
    for (const f of r.fingers) f.obj.position.z = f.dir * (f.base + open * 0.09 - 0.045);

    // 분해 보기
    const to = st.exploded ? 1 : 0;
    explodeT.current += (to - explodeT.current) * (st.reduced ? 1 : 1 - Math.exp(-delta * 5));
    if (Math.abs(to - explodeT.current) < 0.002) explodeT.current = to;
    for (const p of PARTS) {
      const entry = r.parts[p.id];
      if (entry) entry.obj.position.set(entry.base.x + p.explode[0] * explodeT.current, entry.base.y + p.explode[1] * explodeT.current, entry.base.z + p.explode[2] * explodeT.current);
    }

    // 선택 모듈 강조
    for (const p of PARTS) {
      const m = matsRef.current[p.id];
      const base = p.kind === "sensor" ? 0.5 : 0;
      const target = st.selectedId === p.module ? 0.9 : base;
      m.emissiveIntensity += (target - m.emissiveIntensity) * 0.2;
    }

    // IK 목표 마커
    if (marker.current) {
      marker.current.visible = st.ik.on && st.phase !== "loading";
      marker.current.position.set(st.ik.x, st.ik.y, st.ik.z);
      markerMat.current?.color.set(latest.current.reached ? ACCENT : "#ef6b6b");
    }

    // 시점 이동
    const g = viewGoal.current;
    if (g) {
      camera.position.lerp(g, st.reduced ? 1 : 1 - Math.exp(-delta * 6));
      if (camera.position.distanceTo(g) < 0.02) viewGoal.current = null;
    }

    // 프레임 시간 모니터 → 자동 품질 하향
    if (st.phase === "ready" && delta < 0.25) {
      frames.current.sum += delta * 1000;
      frames.current.n++;
      if (frames.current.n >= 60) {
        const avg = frames.current.sum / frames.current.n;
        fpsRef.current = 1000 / avg;
        const next = downgradeTier(st.tier, avg, 22);
        if (next !== st.tier) actions.downgrade(next);
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  const controlsEnabled = phase === "ready";

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#a9bbd9", "#1a2030", 0.9]} />
      <directionalLight position={[4, 7, 4]} intensity={2.6} castShadow={quality.shadows} shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-5, 3, -4]} color={ACCENT} intensity={1.6} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={1.2}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={2} color={ACCENT} position={[4, 0, -3]} scale={4} />
        </Environment>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[4.5, 48]} />
        <meshStandardMaterial color="#1c2433" roughness={0.9} metalness={0} />
      </mesh>
      <gridHelper args={[9, 18, "#33405a", "#232d42"]} position={[0, 0.002, 0]} />
      <group ref={robot}>
        <Boundary onError={ready} fallback={<ProceduralRobot rig={rig} mats={mats} segments={quality.segments} />}>
          <Suspense fallback={null}>
            {glbUrl ? (
              <GlbRobot url={glbUrl} rigRef={rig} onLoaded={ready} onInvalid={onInvalid} />
            ) : (
              <ProceduralRobot rig={rig} mats={mats} segments={quality.segments} />
            )}
          </Suspense>
        </Boundary>
      </group>
      {PARTS.map((p) => (
        <PartLabel key={p.id} id={p.id} rig={rig} explodeT={explodeT} active={state.selectedId === p.module} onSelect={actions.select} />
      ))}
      <group ref={marker} visible={false}>
        <mesh>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshBasicMaterial ref={markerMat} color={ACCENT} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.012, 8, 32]} />
          <meshBasicMaterial color={ACCENT} />
        </mesh>
      </group>
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={controlsEnabled}
        target={CAMERA.target}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI * 0.52}
        onStart={() => actions.setView("free")}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.state.tier];
  return (
    <Boundary onError={props.actions.fail}>
      <Canvas
        frameloop={props.state.visible ? "always" : "never"}
        shadows={preset.shadows}
        dpr={clampDpr(preset.dpr)}
        camera={{ position: VIEWS.home, fov: CAMERA.fov, near: 0.1, far: 60 }}
        gl={{ antialias: props.state.tier !== "low", alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            props.actions.fail("WebGL 컨텍스트가 손실되었어요.");
          });
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </Boundary>
  );
}
