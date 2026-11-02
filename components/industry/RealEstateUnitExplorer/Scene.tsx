"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier } from "@/lib/hero/performance";
import {
  ACCENT,
  CAMERA,
  FACING_VECTOR,
  FLOOR_H,
  MODEL_ASSET,
  QUALITY_PRESETS,
  SLAB_H,
  SLOT_POS,
  STATUS_META,
  SURROUNDINGS,
  UNIT_D,
  UNIT_H,
  UNIT_W,
  unitCenter,
} from "./config";
import type { ExplorerActions, ExplorerState } from "./useExplorer";
import type { UnitRecord } from "./types";

export interface SceneProps {
  units: UnitRecord[]; // 레이아웃 기준(상태 덮어쓰기 전). 상태는 state.overrides 로 반영
  state: ExplorerState;
  actions: ExplorerActions;
  reduced: boolean;
  active: boolean;
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

// ───────── 모델 (절차적 / GLB 공통 규칙: F_<층> > U_<id>) ─────────
function buildProceduralBuilding(units: UnitRecord[]): THREE.Group {
  const root = new THREE.Group();
  root.name = "BUILDING_101";
  const unitGeo = new THREE.BoxGeometry(UNIT_W, UNIT_H, UNIT_D).translate(0, UNIT_H / 2, 0);
  const slabGeo = new THREE.BoxGeometry(4.1, SLAB_H, 2.5);
  const corridorGeo = new THREE.BoxGeometry(3.9, 0.02, 0.2);
  const winNS = new THREE.BoxGeometry(0.9, 0.22, 0.02);
  const winEW = new THREE.BoxGeometry(0.02, 0.22, 0.6);
  const slabMat = new THREE.MeshStandardMaterial({ color: "#8a94a8", roughness: 0.7, metalness: 0.1 });
  const corridorMat = new THREE.MeshStandardMaterial({ color: "#c9d1e0", roughness: 0.8, metalness: 0 });
  const winMat = new THREE.MeshStandardMaterial({ color: "#bcd7ff", emissive: "#4a6a99", emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1 });

  const floors = [...new Set(units.map((u) => u.floor))].sort((a, b) => a - b);
  for (const f of floors) {
    const g = new THREE.Group();
    g.name = `F_${f}`;
    const y0 = (f - 1) * FLOOR_H;
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.name = `S_${f}`;
    slab.position.y = y0 + SLAB_H / 2;
    slab.raycast = () => undefined;
    g.add(slab);
    const corridor = new THREE.Mesh(corridorGeo, corridorMat);
    corridor.name = `C_${f}`;
    corridor.position.y = y0 + SLAB_H + 0.01;
    corridor.raycast = () => undefined;
    g.add(corridor);
    for (const u of units.filter((x) => x.floor === f)) {
      const [x, z] = SLOT_POS[u.slot];
      const m = new THREE.Mesh(unitGeo, slabMat);
      m.name = `U_${u.id}`;
      m.position.set(x, y0 + SLAB_H, z);
      const [dx, dz] = FACING_VECTOR[u.facing];
      const win = new THREE.Mesh(dx === 0 ? winNS : winEW, winMat);
      win.position.set(dx * (UNIT_W / 2 + 0.011), UNIT_H * 0.55, dz * (UNIT_D / 2 + 0.011));
      win.name = `W_${u.id}`;
      m.add(win);
      g.add(m);
    }
    root.add(g);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.08, 2.5), slabMat);
  roof.name = "ROOF";
  roof.position.y = floors.length * FLOOR_H + 0.04;
  roof.raycast = () => undefined;
  root.add(roof);
  return root;
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
  });
}

interface ModelIndex {
  units: Map<string, { node: THREE.Object3D; mat: THREE.MeshStandardMaterial }>;
  floors: Map<number, THREE.Object3D>;
  corridors: Map<number, THREE.Object3D>;
  roof: THREE.Object3D | null;
  dispose(): void;
}

/** 이름 규칙으로 노드를 찾아 호실별 재질을 붙인다. 누락 id 는 missing 으로 돌려준다(자산 체크리스트 검증). */
function indexModel(root: THREE.Object3D, units: UnitRecord[]): { index: ModelIndex; missing: string[] } {
  const map = new Map<string, { node: THREE.Object3D; mat: THREE.MeshStandardMaterial }>();
  const floors = new Map<number, THREE.Object3D>();
  const corridors = new Map<number, THREE.Object3D>();
  const missing: string[] = [];
  for (const u of units) {
    const node = root.getObjectByName(`U_${u.id}`);
    if (!node) {
      missing.push(u.id);
      continue;
    }
    node.userData.unitId = u.id;
    const mat = new THREE.MeshStandardMaterial({ color: STATUS_META[u.status].color, roughness: 0.55, metalness: 0.1 });
    node.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh && !c.name.startsWith("W_")) m.material = mat;
    });
    map.set(u.id, { node, mat });
    const f = Number(/^F_(\d+)$/.exec(node.parent?.name ?? "")?.[1]);
    if (f && !floors.has(f)) floors.set(f, node.parent!);
  }
  root.traverse((o) => {
    const m = /^C_(\d+)$/.exec(o.name);
    if (m) corridors.set(Number(m[1]), o);
  });
  const roof = root.getObjectByName("ROOF") ?? null;
  const index: ModelIndex = { units: map, floors, corridors, roof, dispose: () => map.forEach((e) => e.mat.dispose()) };
  return { index, missing };
}

function resolveUnitId(obj: THREE.Object3D | null): string | null {
  for (let o = obj; o; o = o.parent) if (typeof o.userData.unitId === "string") return o.userData.unitId;
  return null;
}

function ModelRoot({ root, units, onIndexed, onPick, strict }: { root: THREE.Object3D; units: UnitRecord[]; onIndexed: (i: ModelIndex | null) => void; onPick: (id: string) => void; strict: boolean }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { index, missing } = indexModel(root, units);
    if (strict && missing.length > 0) console.warn(`[RealEstateUnitExplorer] GLB 에 호실 노드가 없습니다: ${missing.join(", ")}`);
    onIndexed(index);
    return () => {
      onIndexed(null);
      index.dispose();
    };
  }, [root, units, onIndexed, strict]);
  useEffect(() => () => void (get().gl.domElement.style.cursor = ""), [get]);
  return (
    <primitive
      object={root}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return; // 드래그는 선택이 아님
        const id = resolveUnitId(e.object);
        if (!id) return;
        e.stopPropagation();
        onPick(id);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        get().gl.domElement.style.cursor = resolveUnitId(e.object) ? "pointer" : "";
      }}
      onPointerOut={() => {
        get().gl.domElement.style.cursor = "";
      }}
    />
  );
}

function ProceduralModel(props: Omit<Parameters<typeof ModelRoot>[0], "root" | "strict">) {
  const root = useMemo(() => buildProceduralBuilding(props.units), [props.units]);
  useEffect(() => () => disposeTree(root), [root]);
  return <ModelRoot {...props} root={root} strict={false} />;
}

function GlbModel({ url, ...props }: Omit<Parameters<typeof ModelRoot>[0], "root" | "strict"> & { url: string }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  const missing = props.units.filter((u) => !root.getObjectByName(`U_${u.id}`));
  if (missing.length > 0) throw new Error(`GLB 노드 누락 ${missing.length}건 — 자산 체크리스트 확인`);
  return <ModelRoot {...props} root={root} strict />;
}

function Surroundings() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#2a3242" roughness={0.9} metalness={0} />
      </mesh>
      {SURROUNDINGS.map((s, i) => (
        <mesh key={i} position={s.pos}>
          {s.kind === "box" ? <boxGeometry args={s.size} /> : s.kind === "cone" ? <coneGeometry args={[s.size[0], s.size[1], 5]} /> : <cylinderGeometry args={[s.size[0], s.size[0], s.size[1], 32]} />}
          <meshStandardMaterial color={s.color} roughness={0.8} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// ───────── 장면 ─────────
function applyState(index: ModelIndex, units: UnitRecord[], state: ExplorerState) {
  const cut = state.cutaway && state.floor !== null;
  for (const u of units) {
    const e = index.units.get(u.id);
    if (!e) continue;
    const status = state.overrides[u.id] ?? u.status;
    const on = state.layers[status];
    const sel = state.selectedId === u.id;
    const cmp = state.compareIds.includes(u.id);
    e.mat.color.set(STATUS_META[status].color);
    e.mat.transparent = !on;
    e.mat.opacity = on ? 1 : 0.12;
    e.mat.depthWrite = on;
    e.mat.emissive.set(sel ? ACCENT : cmp ? "#6aa0ff" : u.floor === state.floor ? "#ffffff" : "#000000");
    e.mat.emissiveIntensity = sel ? 0.65 : cmp ? 0.45 : u.floor === state.floor ? 0.14 : 0;
    e.node.scale.y = cut && u.floor === state.floor && state.viewMode !== "window" ? 0.3 : 1;
  }
  index.floors.forEach((g, n) => (g.visible = !cut || n <= (state.floor ?? 0)));
  index.corridors.forEach((c, n) => (c.visible = cut && n === state.floor));
  if (index.roof) index.roof.visible = !cut;
}

const tmpBox = new THREE.Box3();

function SceneContent({ units, state, actions, reduced, active, fpsRef }: SceneProps) {
  const { camera, get } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [index, setIndex] = useState<ModelIndex | null>(null);
  const latest = useRef({ state, units, index });
  const first = useRef(true);
  const frames = useRef({ sum: 0, n: 0 });
  const quality = QUALITY_PRESETS[state.tier];
  const glbUrl = MODEL_ASSET.url;
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  useEffect(() => {
    latest.current = { state, units, index };
  });

  // 인덱싱이 끝나면 로딩 종료
  const { ready, select, setAnimating, downgrade } = actions;
  useEffect(() => {
    if (index) ready();
  }, [index, ready]);

  const onPick = useMemo(
    () => (id: string) => {
      const u = unitMap.get(id);
      const s = latest.current.state;
      if (!u) return;
      const status = s.overrides[id] ?? u.status;
      if (!s.layers[status]) return; // 숨긴 레이어는 선택 불가
      select(id);
    },
    [unitMap, select],
  );

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 상태 → 3D 동기화: 상태 색·강조·레이어·단면
  useEffect(() => {
    if (index) applyState(index, units, state);
  }, [index, units, state]);

  // 시점: 외관 / 창 방향 / 층 평면 (poseKey 가 바뀔 때만 이동, 사용자가 돌린 각도는 유지)
  const poseKey = state.viewMode === "exterior" ? `ext:${state.viewN}` : state.viewMode === "window" ? `win:${state.selectedId}:${state.viewN}` : `plan:${state.floor}:${state.viewN}`;
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const { state: s, units: us, index: idx } = latest.current;
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    const aspect = get().size.width / Math.max(1, get().size.height);
    if (s.viewMode === "exterior") {
      const k = aspect < 1 ? 1.45 : 1;
      target.set(...CAMERA.homeTarget);
      pos.set(CAMERA.homeDir[0] * k, CAMERA.homeDir[1] * k, CAMERA.homeDir[2] * k);
    } else if (s.viewMode === "floorplan") {
      const y = s.floor === null ? 1.8 : (s.floor - 0.5) * FLOOR_H;
      target.set(0, y, 0);
      pos.set(0, y + (s.floor === null ? 9.5 : 6.2) * (aspect < 1 ? 1.4 : 1), 0.9);
    } else {
      const u = us.find((x) => x.id === s.selectedId);
      const node = u ? idx?.units.get(u.id)?.node : undefined;
      if (!u || !node) return;
      const [cx, cy, cz] = unitCenter(u);
      const [dx, dz] = FACING_VECTOR[u.facing];
      tmpBox.setFromObject(node);
      const half = dx === 0 ? (tmpBox.max.z - tmpBox.min.z) / 2 : (tmpBox.max.x - tmpBox.min.x) / 2;
      pos.set(cx + dx * (half + 0.12), cy, cz + dz * (half + 0.12));
      target.set(pos.x + dx * 1.5, cy - 0.04, pos.z + dz * 1.5);
    }
    const instant = reduced || first.current;
    first.current = false;
    if (instant) {
      camera.position.copy(pos);
      c.target.copy(target);
      c.update();
      return;
    }
    const from = { p: camera.position.clone(), t: c.target.clone(), k: 0 };
    setAnimating(true);
    const finish = () => setAnimating(false);
    const tw = gsap.to(from, {
      k: 1,
      duration: CAMERA.duration,
      ease: "power3.inOut",
      onUpdate: () => {
        camera.position.lerpVectors(from.p, pos, from.k);
        c.target.lerpVectors(from.t, target, from.k);
        c.update();
      },
      onComplete: finish,
    });
    // 저프레임/백그라운드 탭에서도 이동 상태가 남지 않도록 벽시계 데드라인
    const deadline = window.setTimeout(() => tw.progress(1), CAMERA.duration * 1000 + 1200);
    return () => {
      window.clearTimeout(deadline);
      tw.kill();
    };
  }, [poseKey, reduced, camera, get, setAnimating]);

  // 프레임 시간 모니터 → 자동 품질 하향
  useFrame((_, delta) => {
    if (delta >= 0.25) return;
    frames.current.sum += delta * 1000;
    if (++frames.current.n >= 60) {
      const avg = frames.current.sum / frames.current.n;
      fpsRef.current = 1000 / avg;
      const next = downgradeTier(state.tier, avg, 22);
      if (next !== state.tier) downgrade(next);
      frames.current = { sum: 0, n: 0 };
    }
  });

  const GlbOrProc = (
    <Boundary onError={() => undefined} fallback={<ProceduralModel units={units} onIndexed={setIndex} onPick={onPick} />}>
      <Suspense fallback={null}>{glbUrl ? <GlbModel url={glbUrl} units={units} onIndexed={setIndex} onPick={onPick} /> : <ProceduralModel units={units} onIndexed={setIndex} onPick={onPick} />}</Suspense>
    </Boundary>
  );

  const autoRotate = !reduced && active && state.viewMode === "exterior" && state.selectedId === null && state.phase === "ready" && !state.isAnimating;
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#9fb4d6", "#1a2030", 0.9]} />
      <directionalLight position={[5, 8, 4]} intensity={2.4} />
      <directionalLight position={[-5, 3, -4]} intensity={1.1} color="#9fb4d6" />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <Surroundings />
      {GlbOrProc}
      {/* 휠 줌 끔, 이동 금지, 극각·거리 제한. 이동 중에는 사용자 입력 차단 */}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={state.phase === "ready" && !state.isAnimating}
        enableZoom={false}
        enablePan={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI * 0.56}
        autoRotate={autoRotate}
        autoRotateSpeed={CAMERA.autoRotateSpeed}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.state.tier];
  return (
    <Boundary onError={props.actions.fail}>
      <Canvas
        frameloop={props.active ? "always" : "never"}
        dpr={clampDpr(preset.dpr)}
        camera={{ position: [...CAMERA.homeDir], fov: CAMERA.fov, near: 0.05, far: 80 }}
        gl={{ antialias: props.state.tier !== "low", alpha: true, powerPreference: "high-performance" }}
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
