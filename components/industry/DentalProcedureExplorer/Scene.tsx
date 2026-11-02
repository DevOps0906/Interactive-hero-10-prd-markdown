"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier } from "@/lib/hero/performance";
import {
  ACCENT,
  CAMERA,
  DEFAULT_TOOTH_ID,
  LAYERS,
  MODEL_ASSET,
  PROCEDURE_BY_ID,
  QUALITY_PRESETS,
  TEETH,
  TEETH_BY_ID,
  type LayerId,
  type QualityTier,
  type Tooth,
} from "./config";
import type { ExplorerActions, ExplorerState } from "./useExplorer";
import styles from "./DentalProcedureExplorer.module.css";

export interface SceneProps {
  state: ExplorerState;
  actions: ExplorerActions;
  reduced: boolean;
  tier: QualityTier;
  fpsRef: MutableRefObject<number>;
}

// ───────── 에러 경계 (WebGL 실패·GLB 로드 실패) ─────────
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

const Y_AXIS = new THREE.Vector3(0, 1, 0);
/** 교정 단계 시각화용: 치아별 고정된 어긋남 각도(rad) */
const wobbleOf = (id: string) => (((parseInt(id, 10) * 37) % 11) - 5) * 0.07;

type GroupRegistry = MutableRefObject<Record<string, THREE.Group | null>>;

// ───────── 재료 ─────────
function useMaterials() {
  const mats = useMemo(
    () => ({
      base: new THREE.MeshStandardMaterial({ color: "#ece8dc", roughness: 0.45, metalness: 0 }),
      selected: new THREE.MeshStandardMaterial({ color: "#f4f1e8", roughness: 0.4, metalness: 0, emissive: ACCENT, emissiveIntensity: 0.55 }),
      damaged: new THREE.MeshStandardMaterial({ color: "#b09468", roughness: 0.6, metalness: 0 }),
      crown: new THREE.MeshStandardMaterial({ color: "#d9f5f0", roughness: 0.25, metalness: 0.1, emissive: ACCENT, emissiveIntensity: 0.25 }),
      bracket: new THREE.MeshStandardMaterial({ color: "#aab4c4", roughness: 0.35, metalness: 0.4 }),
      gum: new THREE.MeshStandardMaterial({ color: "#d98a93", roughness: 0.7, metalness: 0 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  return mats;
}
type Mats = ReturnType<typeof useMaterials>;

// ───────── 치열 ─────────
interface ToothGroupProps {
  tooth: Tooth;
  register: (id: string, g: THREE.Group | null) => void;
  mats: Mats;
  segments: number;
  selected: boolean;
  shrink: boolean;
  damaged: boolean;
  crown: boolean;
  bracket: boolean;
  onSelect: (id: string) => void;
}

function ToothGroup({ tooth, register, mats, segments, selected, shrink, damaged, crown, bracket, onSelect }: ToothGroupProps) {
  const [w, h, d] = tooth.size;
  const material = damaged ? mats.damaged : selected ? mats.selected : mats.base;
  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(tooth.id);
  };
  const s = shrink ? ([0.8, 0.88, 0.8] as const) : ([1, 1, 1] as const);
  return (
    <group
      ref={(g) => register(tooth.id, g)}
      name={`tooth-${tooth.id}`}
      position={tooth.position}
      rotation={[0, tooth.rotY, 0]}
    >
      <group scale={s}>
        {tooth.kind === "canine" ? (
          <mesh material={material} onClick={pick} scale={[1, 1, d / w]}>
            <cylinderGeometry args={[w * 0.12, w * 0.55, h, segments]} />
          </mesh>
        ) : (
          <RoundedBox args={[w, h, d]} radius={Math.min(w, d) * 0.28} smoothness={segments > 12 ? 4 : 2} material={material} onClick={pick} />
        )}
        {damaged && (
          <mesh position={[0, h / 2, 0.02]}>
            <sphereGeometry args={[Math.min(w, d) * 0.32, 10, 8]} />
            <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
          </mesh>
        )}
      </group>
      {crown && <RoundedBox args={[w * 1.12, h * 1.06, d * 1.12]} radius={Math.min(w, d) * 0.3} smoothness={3} material={mats.crown} />}
      {bracket && (
        <mesh position={[0, 0, d / 2 + 0.02]} material={mats.bracket}>
          <boxGeometry args={[0.1, 0.08, 0.04]} />
        </mesh>
      )}
    </group>
  );
}

function ScanRing({ tooth, reduced }: { tooth: Tooth; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const k = 1 + Math.sin(clock.elapsedTime * 3) * 0.08;
    ref.current.scale.set(k, k, 1);
  });
  const r = Math.max(tooth.size[0], tooth.size[2]) * 0.95;
  return (
    <mesh ref={ref} position={tooth.position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[r, 0.014, 8, 40]} />
      <meshBasicMaterial color={ACCENT} />
    </mesh>
  );
}

function ArchWire({ teeth, material }: { teeth: Tooth[]; material: THREE.Material }) {
  const curve = useMemo(() => {
    const pts = [...teeth]
      .sort((a, b) => a.position[0] - b.position[0])
      .map((t) => {
        const off = t.size[2] / 2 + 0.04;
        return new THREE.Vector3(t.position[0] + Math.sin(t.rotY) * off, t.position[1], t.position[2] + Math.cos(t.rotY) * off);
      });
    return new THREE.CatmullRomCurve3(pts);
  }, [teeth]);
  return (
    <mesh material={material}>
      <tubeGeometry args={[curve, 64, 0.012, 6, false]} />
    </mesh>
  );
}

function Gum({ jaw, material }: { jaw: "upper" | "lower"; material: THREE.Material }) {
  const curve = useMemo(() => {
    const pts = TEETH.filter((t) => t.jaw === jaw)
      .sort((a, b) => a.position[0] - b.position[0])
      .map((t) => new THREE.Vector3(t.position[0], t.position[1] + (jaw === "upper" ? 1 : -1) * (t.size[1] / 2 + 0.05), t.position[2] - 0.1));
    return new THREE.CatmullRomCurve3(pts);
  }, [jaw]);
  return (
    <mesh material={material}>
      <tubeGeometry args={[curve, 64, 0.2, 10, false]} />
    </mesh>
  );
}

/** GLB 모델: `tooth-<FDI>` 이름의 노드를 치아로 사용한다. 선택된 치아만 선택 재질로 교체. */
function GlbArch({ url, selectedId, mats, onSelect, onLoaded }: { url: string; selectedId: string | null; mats: Mats; onSelect: (id: string) => void; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => onLoaded(), [onLoaded]);
  useEffect(() => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      let n: THREE.Object3D | null = m;
      while (n && !n.name.startsWith("tooth-")) n = n.parent;
      m.userData.original ??= m.material;
      m.material = n && n.name === `tooth-${selectedId}` ? mats.selected : m.userData.original;
    });
  }, [root, selectedId, mats]);
  return (
    <primitive
      object={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        let n: THREE.Object3D | null = e.object;
        while (n && !n.name.startsWith("tooth-")) n = n.parent;
        if (n) {
          e.stopPropagation();
          onSelect(n.name.slice(6));
        }
      }}
    />
  );
}

// ───────── 단면도 ─────────
const CUT_PLANE = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.02);

function CutawayModel({ tooth, layerId, segments }: { tooth: Tooth; layerId: LayerId | null; segments: number }) {
  const planes = useMemo(() => [CUT_PLANE], []);
  const crownScale: [number, number, number] =
    tooth.kind === "molar" ? [1.25, 0.75, 1.15] : tooth.kind === "premolar" ? [0.95, 0.8, 0.9] : tooth.kind === "canine" ? [0.75, 1.0, 0.75] : [0.8, 0.95, 0.5];
  const roots: number[] = tooth.kind === "molar" ? [-0.38, 0.38] : [0];
  const rootLen = tooth.kind === "canine" ? 1.5 : 1.15;
  const layerProps = (id: LayerId) => {
    const info = LAYERS.find((l) => l.id === id)!;
    const dim = layerId !== null && layerId !== id;
    const on = layerId === id;
    return { color: info.color, side: THREE.DoubleSide, clippingPlanes: planes, roughness: 0.5, transparent: dim, opacity: dim ? 0.35 : 1, emissive: on ? ACCENT : "#000000", emissiveIntensity: on ? 0.5 : 0 } as const;
  };
  const sc = (k: number): [number, number, number] => [crownScale[0] * k, crownScale[1] * k, crownScale[2] * k];
  return (
    <group position={[0, 0, 0]} scale={1.15}>
      <mesh position={[0, 0.7, 0]} scale={sc(1)}>
        <sphereGeometry args={[0.8, segments * 2, segments]} />
        <meshStandardMaterial {...layerProps("enamel")} />
      </mesh>
      <mesh position={[0, 0.7, 0]} scale={sc(0.82)}>
        <sphereGeometry args={[0.8, segments * 2, segments]} />
        <meshStandardMaterial {...layerProps("dentin")} />
      </mesh>
      <mesh position={[0, 0.62, 0]} scale={sc(0.38)}>
        <sphereGeometry args={[0.8, segments, segments]} />
        <meshStandardMaterial {...layerProps("pulp")} />
      </mesh>
      {roots.map((x) => (
        <group key={x} position={[x * crownScale[0] * 0.8, 0.1 - rootLen / 2, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.3 * (tooth.kind === "molar" ? 0.85 : 1), rootLen, segments, 1, true]} />
            <meshStandardMaterial {...layerProps("root")} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.05, 0.015, rootLen * 0.85, 8]} />
            <meshStandardMaterial {...layerProps("pulp")} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier, fpsRef }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, size } = useThree();
  const mats = useMaterials();
  const yaw = useRef<THREE.Group>(null);
  const archRef = useRef<THREE.Group>(null);
  const cutRef = useRef<THREE.Group>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const registry: GroupRegistry = useRef({});
  const register = useCallback((id: string, g: THREE.Group | null) => {
    registry.current[id] = g;
  }, []);
  const wobble = useRef({ k: 0 });
  const frames = useRef({ sum: 0, n: 0 });

  const { ready, animDone, select } = actions;
  const glbUrl = MODEL_ASSET.url;
  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);

  const targetId = state.selectedId ?? DEFAULT_TOOTH_ID;
  const target = TEETH_BY_ID[targetId];
  const step = PROCEDURE_BY_ID[state.procedureId].steps[state.stepIndex];
  const visual = step.visual;
  const isOrtho = state.procedureId === "orthodontic";
  const jawTeeth = useMemo(() => TEETH.filter((t) => t.jaw === target.jaw), [target.jaw]);
  const showBrackets = isOrtho && (visual === "brackets" || visual === "wire" || visual === "align");
  const showWire = isOrtho && (visual === "wire" || visual === "align");
  const wobbleTarget = isOrtho && (visual === "scan" || visual === "brackets" || visual === "wire") ? 1 : 0;

  // 뷰포트 비율에 맞춰 스케일 (좁은 화면 잘림 방지)
  useEffect(() => {
    yaw.current?.scale.setScalar(THREE.MathUtils.clamp((size.width / size.height) * 1.15, 0.62, 1.05));
  }, [size.width, size.height]);

  // 터치: 세로 스와이프는 페이지 스크롤
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 교정 단계: 치아 어긋남 ↔ 정렬 전환
  useEffect(() => {
    const tw = gsap.to(wobble.current, { k: wobbleTarget, duration: reduced ? 0 : 0.9, ease: "power2.inOut" });
    return () => {
      tw.kill();
    };
  }, [wobbleTarget, reduced]);

  // 보기 전환(치열 ↔ 단면도): 스케일 인
  useEffect(() => {
    const arch = state.viewMode === "arch";
    const incoming = arch ? archRef.current : cutRef.current;
    if (!incoming) return;
    if (reduced) {
      incoming.scale.setScalar(1);
      return;
    }
    const tw = gsap.fromTo(incoming.scale, { x: 0.85, y: 0.85, z: 0.85 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power2.out" });
    return () => {
      tw.kill();
      incoming.scale.setScalar(1);
    };
  }, [state.viewMode, reduced]);

  // 카메라 포커스: 선택·보기·초기화 시 이동. 끝나면 isAnimating 해제
  const { selectedId, viewMode, resetN } = state;
  useEffect(() => {
    const c = controls.current;
    if (!c || !yaw.current) return;
    const dur = reduced ? 0 : 0.8;
    let to = { pos: new THREE.Vector3(...CAMERA.home), tgt: new THREE.Vector3(...CAMERA.homeTarget) };
    if (viewMode === "cutaway") {
      to = { pos: new THREE.Vector3(...CAMERA.cutaway), tgt: new THREE.Vector3(...CAMERA.cutawayTarget) };
    } else if (selectedId) {
      const t = TEETH_BY_ID[selectedId];
      const v = new THREE.Vector3(...t.position).applyAxisAngle(Y_AXIS, yaw.current.rotation.y);
      to = { pos: new THREE.Vector3(v.x * 1.2, v.y + 1.4, v.z + 3.3), tgt: new THREE.Vector3(v.x, v.y * 0.6, v.z) };
    }
    const ctx = gsap.context(() => {
      gsap
        .timeline({ onComplete: animDone, defaults: { duration: dur, ease: "power3.inOut" } })
        .to(camera.position, { x: to.pos.x, y: to.pos.y, z: to.pos.z }, 0)
        .to(c.target, { x: to.tgt.x, y: to.tgt.y, z: to.tgt.z }, 0);
    });
    return () => ctx.kill();
  }, [selectedId, viewMode, resetN, reduced, camera, animDone]);

  // 회전 버튼 / 초기화
  const nudgeN = state.nudge.n;
  const nudgeDir = state.nudge.dir;
  useEffect(() => {
    if (nudgeN === 0 || !yaw.current) return;
    const tw = gsap.to(yaw.current.rotation, { y: `+=${nudgeDir * (Math.PI / 8)}`, duration: reduced ? 0 : 0.4, ease: "power2.out" });
    return () => {
      tw.kill();
    };
  }, [nudgeN, nudgeDir, reduced]);
  useEffect(() => {
    if (resetN === 0 || !yaw.current) return;
    const tw = gsap.to(yaw.current.rotation, { y: 0, duration: reduced ? 0 : 0.6, ease: "power2.inOut" });
    return () => {
      tw.kill();
    };
  }, [resetN, reduced]);

  useFrame((_, delta) => {
    const k = wobble.current.k;
    for (const t of TEETH) {
      const g = registry.current[t.id];
      if (g) g.rotation.y = t.rotY + (t.jaw === target.jaw ? k * wobbleOf(t.id) : 0);
    }
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

  const procedural = (
    <>
      {TEETH.map((t) => {
        const isTarget = t.id === targetId;
        const selected = t.id === state.selectedId;
        return (
          <ToothGroup
            key={t.id}
            tooth={t}
            register={register}
            mats={mats}
            segments={quality.segments}
            selected={selected}
            shrink={isTarget && visual === "prep"}
            damaged={isTarget && state.beforeAfter === "before"}
            crown={isTarget && (state.beforeAfter === "after" || (visual === "crown" && state.procedureId === "prosthetic"))}
            bracket={showBrackets && t.jaw === target.jaw}
            onSelect={select}
          />
        );
      })}
    </>
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#bcd0ee", "#2a2030", 0.9]} />
      <directionalLight position={[3, 6, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -3]} color={ACCENT} intensity={1.1} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={1.1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <group ref={yaw}>
        <group ref={archRef} visible={state.viewMode === "arch"}>
          <Boundary onError={ready} fallback={procedural}>
            <Suspense fallback={null}>{glbUrl ? <GlbArch url={glbUrl} selectedId={state.selectedId} mats={mats} onSelect={select} onLoaded={ready} /> : procedural}</Suspense>
          </Boundary>
          {!glbUrl && <Gum jaw="upper" material={mats.gum} />}
          {!glbUrl && <Gum jaw="lower" material={mats.gum} />}
          {visual === "scan" && <ScanRing tooth={target} reduced={reduced} />}
          {showWire && <ArchWire teeth={jawTeeth} material={mats.bracket} />}
          {state.selectedId && (
            <Html position={[target.position[0], target.position[1] + (target.jaw === "upper" ? 0.55 : -0.55), target.position[2]]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <span className={styles.tag}>{target.id}</span>
            </Html>
          )}
        </group>
        <group ref={cutRef} visible={state.viewMode === "cutaway"}>
          <CutawayModel tooth={target} layerId={state.layerId} segments={quality.segments} />
        </group>
      </group>
      {/* 카메라 한계: 이동 금지, 거리·극각 제한, 휠 줌 끔 */}
      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.72}
        target={CAMERA.homeTarget}
      />
    </>
  );
}

/** 화면 밖·탭 숨김일 때 렌더 루프를 멈춘다. */
function useRunning(wrap: RefObject<HTMLDivElement | null>) {
  const [run, setRun] = useState(true);
  useEffect(() => {
    const flags = { inView: true, tabVisible: true };
    const update = () => setRun(flags.inView && flags.tabVisible);
    const io = new IntersectionObserver(([entry]) => {
      flags.inView = entry.isIntersecting;
      update();
    });
    if (wrap.current) io.observe(wrap.current);
    const onVis = () => {
      flags.tabVisible = !document.hidden;
      update();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [wrap]);
  return run;
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  const wrap = useRef<HTMLDivElement>(null);
  const run = useRunning(wrap);
  return (
    <div ref={wrap} className={styles.canvasWrap}>
      <Boundary onError={props.actions.fail}>
        <Canvas
          frameloop={run ? "always" : "never"}
          dpr={clampDpr(preset.dpr)}
          camera={{ position: CAMERA.home, fov: CAMERA.fov, near: 0.1, far: 60 }}
          gl={{ antialias: props.tier !== "low", alpha: true, powerPreference: "high-performance", localClippingEnabled: true }}
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
    </div>
  );
}
