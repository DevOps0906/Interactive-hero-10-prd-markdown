"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { ACCENT, CAMERA, MODEL_ASSET, QUALITY_PRESETS, STEP_X } from "./config";
import type { JourneyActions, JourneyState } from "./useJourneyState";
import type { DocData, ServiceData, StepData } from "./types";

export interface SceneProps {
  service: ServiceData;
  state: JourneyState;
  actions: JourneyActions;
  reduced: boolean;
  tier: QualityTier;
  /** 화면 안 + 탭 표시 중일 때만 true. false 면 렌더 루프 중단 */
  active: boolean;
  autoQuality: boolean;
  onDowngrade: (t: QualityTier) => void;
}

class Boundary extends Component<{ children: ReactNode; fallback?: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}

const BODY = "#3a4252";
const BODY_LIGHT = "#59647a";
const PAPER = "#dfe3ea";

type Role = "current" | "prereq" | "idle";

// ───────── 절차적 아이콘 (GLB 노드 step-<id> 가 있으면 그것으로 대체) ─────────
function Icon({ kind, seg }: { kind: StepData["icon"]; seg: number }) {
  const m = <meshStandardMaterial color={BODY_LIGHT} roughness={0.55} metalness={0.2} />;
  const paper = <meshStandardMaterial color={PAPER} roughness={0.8} />;
  const gold = <meshStandardMaterial color={ACCENT} roughness={0.4} metalness={0.3} />;
  switch (kind) {
    case "folder":
      return (
        <group>
          <mesh position={[0, 0.35, 0]}><boxGeometry args={[1.0, 0.7, 0.14]} />{gold}</mesh>
          <mesh position={[-0.3, 0.75, 0]}><boxGeometry args={[0.4, 0.14, 0.14]} />{gold}</mesh>
          <mesh position={[0, 0.4, 0.09]}><boxGeometry args={[0.85, 0.5, 0.04]} />{paper}</mesh>
        </group>
      );
    case "review":
      return (
        <group>
          <mesh position={[-0.12, 0.45, 0]}><boxGeometry args={[0.7, 0.9, 0.06]} />{paper}</mesh>
          <mesh position={[0.25, 0.4, 0.12]}><torusGeometry args={[0.24, 0.045, 10, seg]} />{gold}</mesh>
          <mesh position={[0.45, 0.2, 0.12]} rotation={[0, 0, Math.PI / 4]}><cylinderGeometry args={[0.04, 0.04, 0.35, 8]} />{gold}</mesh>
        </group>
      );
    case "building":
      return (
        <group>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[1.2, 0.16, 0.7]} />{m}</mesh>
          {[-0.4, -0.13, 0.13, 0.4].map((x) => (
            <mesh key={x} position={[x, 0.5, 0]}><cylinderGeometry args={[0.07, 0.07, 0.6, 10]} />{paper}</mesh>
          ))}
          <mesh position={[0, 0.9, 0]}><boxGeometry args={[1.3, 0.14, 0.8]} />{m}</mesh>
          <mesh position={[0, 1.08, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.7, 0.28, 4]} />{gold}</mesh>
        </group>
      );
    case "stamp":
      return (
        <group>
          <mesh position={[0, 0.08, 0]}><cylinderGeometry args={[0.5, 0.5, 0.06, seg]} />{paper}</mesh>
          <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.32, 0.36, 0.2, seg]} />{gold}</mesh>
          <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.1, 0.1, 0.45, 12]} />{m}</mesh>
          <mesh position={[0, 0.8, 0]}><sphereGeometry args={[0.17, 16, 12]} />{m}</mesh>
        </group>
      );
  }
}

function StepNode({ step, role, glb, seg, onPick }: { step: StepData; role: Role; glb: THREE.Object3D | null; seg: number; onPick: () => void }) {
  const glbNode = useMemo(() => glb?.getObjectByName(MODEL_ASSET.nodes.step(step.id))?.clone(true) ?? null, [glb, step.id]);
  const emissive = role === "current" ? 0.9 : role === "prereq" ? 0.45 : 0;
  return (
    <group
      name={MODEL_ASSET.nodes.step(step.id)}
      userData={{ id: step.id }}
      position={[STEP_X[step.id], 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.2, seg]} />
        <meshStandardMaterial color={BODY} emissive={ACCENT} emissiveIntensity={emissive} roughness={0.5} metalness={0.2} />
      </mesh>
      {role === "current" && (
        <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.05, 0.04, 8, seg]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} />
        </mesh>
      )}
      <group position={[0, 0.2, 0]} scale={role === "current" ? 1.12 : 1}>
        {glbNode ? <primitive object={glbNode} /> : <Icon kind={step.icon} seg={seg} />}
      </group>
    </group>
  );
}

// ───────── 연결선 (선행 → 후행) ─────────
function Edge({ from, to, hot, seg }: { from: StepData; to: StepData; hot: boolean; seg: number }) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(STEP_X[from.id], 0.95, 0);
    const b = new THREE.Vector3(STEP_X[to.id], 0.95, 0);
    const far = Math.abs(STEP_X[to.id] - STEP_X[from.id]) > 2.5;
    const ctrl = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, far ? 1.6 : 0, far ? -0.6 : 0));
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, ctrl, b), Math.max(12, seg), 0.035, 6, false);
  }, [from.id, to.id, seg]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} name={`edge-${from.id}-${to.id}`}>
      <meshStandardMaterial color={hot ? ACCENT : "#6b7690"} emissive={ACCENT} emissiveIntensity={hot ? 1.1 : 0} roughness={0.5} />
    </mesh>
  );
}

// ───────── 문서 카드 스택 ─────────
interface DocCardProps {
  doc: DocData;
  index: number;
  total: number;
  mode: "stack" | "fan";
  selected: boolean;
  owned: boolean;
  reduced: boolean;
  onPick: () => void;
}

function DocCard({ doc, index, total, mode, selected, owned, reduced, onPick }: DocCardProps) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const mid = (total - 1) / 2;
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const t =
      mode === "fan"
        ? { x: (index - mid) * 1.45, y: selected ? 1.3 : 1.0, z: selected ? 2.9 : 2.4, ry: -(index - mid) * 0.1, s: selected ? 1.12 : 1 }
        : { x: (index - mid) * 0.12, y: 0.75, z: 3.0 + index * 0.07, ry: -0.1 + index * 0.02, s: 0.8 };
    const d = reduced ? 0 : 0.6;
    const ctx = gsap.context(() => {
      gsap.to(g.position, { x: t.x, y: t.y, z: t.z, duration: d, ease: "power3.out", onUpdate: invalidate, onComplete: invalidate });
      gsap.to(g.rotation, { y: t.ry, duration: d, ease: "power3.out" });
      gsap.to(g.scale, { x: t.s, y: t.s, z: t.s, duration: d, ease: "power3.out" });
    });
    return () => ctx.kill();
  }, [mode, selected, index, mid, reduced, invalidate]);
  return (
    <group
      ref={ref}
      name={MODEL_ASSET.nodes.doc(doc.id)}
      userData={{ id: doc.id }}
      position={[0, 0.75, 3.4]}
      scale={0.8}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    >
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[1.3, 1.8, 0.04]} />
        <meshStandardMaterial color={PAPER} roughness={0.8} emissive={ACCENT} emissiveIntensity={selected ? 0.25 : 0} />
      </mesh>
      <mesh position={[0, 1.62, 0.03]}>
        <boxGeometry args={[1.3, 0.2, 0.02]} />
        <meshStandardMaterial color={ACCENT} roughness={0.5} />
      </mesh>
      {[1.2, 0.95, 0.7, 0.45].map((y, i) => (
        <mesh key={y} position={[i === 3 ? -0.2 : 0, y, 0.03]}>
          <boxGeometry args={[i === 3 ? 0.6 : 0.95, 0.07, 0.01]} />
          <meshStandardMaterial color="#7b8594" />
        </mesh>
      ))}
      {owned && (
        <mesh position={[0.45, 0.25, 0.04]}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#2f9e66" emissive="#2f9e66" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}

// ───────── 장면 본체 ─────────
function Journey({ service, state, actions, reduced, seg, glb }: Pick<SceneProps, "service" | "state" | "actions" | "reduced"> & { seg: number; glb: THREE.Object3D | null }) {
  const current = service.steps[state.stepIndex] ?? service.steps[0];
  const focus = state.viewMode === "process";
  const owned = state.owned[service.id] ?? [];
  const edges = useMemo(
    () => service.steps.flatMap((to) => to.requires.map((r) => ({ from: service.steps.find((s) => s.id === r)!, to }))),
    [service],
  );
  const roleOf = (s: StepData): Role => (!focus ? "idle" : s.id === current.id ? "current" : current.requires.includes(s.id) ? "prereq" : "idle");
  return (
    <>
      {service.steps.map((s, i) => (
        <StepNode key={s.id} step={s} role={roleOf(s)} glb={glb} seg={seg} onPick={() => actions.selectStep(i)} />
      ))}
      {edges.map((e) => (
        <Edge key={`${e.from.id}-${e.to.id}`} from={e.from} to={e.to} hot={focus && e.to.id === current.id} seg={seg} />
      ))}
      {service.docs.map((d, i) => (
        <DocCard
          key={d.id}
          doc={d}
          index={i}
          total={service.docs.length}
          mode={state.viewMode === "documents" ? "fan" : "stack"}
          selected={state.docId === d.id}
          owned={owned.includes(d.id)}
          reduced={reduced}
          onPick={() => actions.openDoc(state.docId === d.id ? null : d.id)}
        />
      ))}
    </>
  );
}

function GlbLoader({ url, render, onLoaded }: { url: string; render: (scene: THREE.Object3D) => ReactNode; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => onLoaded(), [onLoaded]);
  return <>{render(root)}</>;
}

function SceneContent({ service, state, actions, reduced, tier, autoQuality, onDowngrade }: SceneProps) {
  const { camera, size, invalidate } = useThree();
  const look = useRef(new THREE.Vector3(...CAMERA.intro.target));
  const frames = useRef({ sum: 0, n: 0 });
  const preset = QUALITY_PRESETS[tier];
  const glbUrl = MODEL_ASSET.url;
  const { ready, introDone, animDone } = actions;

  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);

  // 인터랙션 3: GSAP 카메라 이동 (인트로 포함). 인트로는 벽시계 데드라인으로 반드시 끝낸다.
  const { phase, viewMode, stepIndex } = state;
  const stepId = service.steps[stepIndex]?.id ?? "intake";
  const aspect = size.width / Math.max(size.height, 1);
  useEffect(() => {
    if (phase === "loading" || phase === "fallback") return;
    const dest = viewMode === "documents" ? CAMERA.documents : viewMode === "process" ? CAMERA.step(STEP_X[stepId]) : CAMERA.overview;
    const fit = Math.max(1, 1.5 / aspect); // 좁은 화면에서는 멀리서 본다
    const tgt = new THREE.Vector3(...dest.target);
    const pos = new THREE.Vector3(...dest.pos).sub(tgt).multiplyScalar(fit).add(tgt);
    const intro = phase === "intro";
    const dur = reduced ? 0 : intro ? CAMERA.introMs / 1000 : CAMERA.moveMs;
    const finish = () => (intro ? introDone() : animDone());
    const ctx = gsap.context(() => {
      gsap.to(camera.position, { x: pos.x, y: pos.y, z: pos.z, duration: dur, ease: "power3.inOut", onUpdate: invalidate, onComplete: finish });
      gsap.to(look.current, { x: tgt.x, y: tgt.y, z: tgt.z, duration: dur, ease: "power3.inOut" });
    });
    const deadline = intro
      ? window.setTimeout(() => {
          camera.position.copy(pos);
          look.current.copy(tgt);
          invalidate();
          introDone();
        }, CAMERA.introDeadlineMs)
      : undefined;
    return () => {
      ctx.kill();
      if (deadline !== undefined) window.clearTimeout(deadline);
    };
  }, [phase, viewMode, stepId, aspect, reduced, camera, invalidate, introDone, animDone]);

  // 상태가 바뀌면 demand 모드(모션 감소)에서도 한 번 그린다
  useEffect(() => {
    invalidate();
  }, [state, invalidate]);

  useFrame((_, delta) => {
    camera.lookAt(look.current);
    if ((phase === "ready" || phase === "intro") && delta < 0.25) {
      frames.current.sum += delta * 1000;
      if (++frames.current.n >= 60) {
        const avg = frames.current.sum / frames.current.n;
        if (autoQuality) {
          const next = downgradeTier(tier, avg, 22);
          if (next !== tier) onDowngrade(next);
        }
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  const render = (glb: THREE.Object3D | null) => <Journey service={service} state={state} actions={actions} reduced={reduced} seg={preset.segments} glb={glb} />;

  return (
    <>
      <color attach="background" args={["#0d1118"]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#aab8d4", "#1a2030", 0.9]} />
      <directionalLight position={[4, 7, 5]} intensity={2.4} />
      <directionalLight position={[-5, 3, -4]} color={ACCENT} intensity={1.2} />
      {preset.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={1.1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[9, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-6, 1, 0]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 1]}>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#1a2030" roughness={0.9} />
      </mesh>
      {glbUrl ? (
        <Boundary onError={ready} fallback={render(null)}>
          <Suspense fallback={null}>
            <GlbLoader url={glbUrl} render={render} onLoaded={ready} />
          </Suspense>
        </Boundary>
      ) : (
        render(null)
      )}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  const { fail } = props.actions;
  return (
    <Boundary onError={fail}>
      <Canvas
        frameloop={!props.active ? "never" : props.reduced ? "demand" : "always"}
        dpr={clampDpr(preset.dpr)}
        camera={{ position: [...CAMERA.intro.pos], fov: CAMERA.fov, near: 0.1, far: 80 }}
        gl={{ antialias: props.tier !== "low", alpha: false, powerPreference: "high-performance" }}
        style={{ touchAction: "pan-y" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            fail();
          });
        }}
      >
        <SceneContent {...props} />
      </Canvas>
    </Boundary>
  );
}
