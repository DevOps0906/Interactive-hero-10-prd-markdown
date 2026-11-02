"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { DAYLIGHT_BY_ID, DOOR, FURNITURE, LOOK_STEP, MODEL_ASSET, ORBIT_HOME, QUALITY_PRESETS, ROOM, VIEWPOINTS, WINDOW } from "./config";
import { findOverlaps, materialOf } from "./logic";
import type { Actions, State } from "./useConfigurator";
import type { DaylightPreset, FurnitureId, FurnitureSpec, ItemState, MaterialOption, SceneConfig, SurfaceId, Vec3 } from "./types";
import styles from "./InteriorSpaceConfigurator.module.css";

export interface SceneProps {
  state: State;
  actions: Actions;
  reduced: boolean;
  tier: QualityTier;
}

const ACCENT_3D = "#2fb5a4";
const DANGER_3D = "#d64545";

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

/** 화면 밖·탭 숨김이면 false (렌더 루프 중단용). */
function useStageActive(ref: MutableRefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true);
  const [tabOn, setTabOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    const onVis = () => setTabOn(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ref]);
  return visible && tabOn;
}

// ───────── 표면 재질 (PBR 교체) ─────────
type SurfaceMats = Record<SurfaceId, THREE.MeshStandardMaterial>;

function useSurfaceTween(mat: THREE.MeshStandardMaterial, m: MaterialOption, reduced: boolean) {
  const { color, roughness, metalness } = m;
  useEffect(() => {
    const c = new THREE.Color(color);
    if (reduced) {
      gsap.set(mat.color, { r: c.r, g: c.g, b: c.b });
      gsap.set(mat, { roughness, metalness });
      return;
    }
    const t1 = gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: 0.5, ease: "power2.inOut", overwrite: "auto" });
    const t2 = gsap.to(mat, { roughness, metalness, duration: 0.5, overwrite: "auto" });
    return () => {
      t1.kill();
      t2.kill();
    };
  }, [mat, color, roughness, metalness, reduced]);
}

function useSurfaceMaterials(config: SceneConfig, reduced: boolean): SurfaceMats {
  const mats = useMemo<SurfaceMats>(() => {
    const make = (s: SurfaceId, id: string) => {
      const m = materialOf(s, id);
      const mat = new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness, metalness: m.metalness });
      mat.name = m.slot;
      return mat;
    };
    return { floor: make("floor", config.floor), wall: make("wall", config.wall), ceiling: make("ceiling", config.ceiling) };
    // 초기 생성만. 이후 변경은 아래 effect 가 트윈한다.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );
  useSurfaceTween(mats.floor, materialOf("floor", config.floor), reduced);
  useSurfaceTween(mats.wall, materialOf("wall", config.wall), reduced);
  useSurfaceTween(mats.ceiling, materialOf("ceiling", config.ceiling), reduced);
  return mats;
}

// ───────── 방 셸 ─────────
function wallGeometry(width: number, height: number, hole?: { cx: number; y0: number; w: number; h: number }): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  if (hole) {
    const p = new THREE.Path();
    p.moveTo(hole.cx - hole.w / 2, hole.y0);
    p.lineTo(hole.cx + hole.w / 2, hole.y0);
    p.lineTo(hole.cx + hole.w / 2, hole.y0 + hole.h);
    p.lineTo(hole.cx - hole.w / 2, hole.y0 + hole.h);
    p.closePath();
    shape.holes.push(p);
  }
  return new THREE.ShapeGeometry(shape);
}

function Shell({ mats, skyMat, onSelectSurface }: { mats: SurfaceMats; skyMat: MutableRefObject<THREE.MeshBasicMaterial | null>; onSelectSurface: (s: SurfaceId) => void }) {
  const { w, d, h } = ROOM;
  const geos = useMemo(
    () => ({
      north: new THREE.PlaneGeometry(w, h),
      side: wallGeometry(d, h),
      east: wallGeometry(d, h, { cx: WINDOW.z, y0: WINDOW.sill, w: WINDOW.w, h: WINDOW.h }),
      west: wallGeometry(d, h, { cx: -DOOR.z, y0: 0, w: DOOR.w, h: DOOR.h }),
      floor: new THREE.PlaneGeometry(w, d),
    }),
    [w, d, h],
  );
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
    },
    [geos],
  );
  const pick = (s: SurfaceId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectSurface(s);
  };
  // 벽은 안쪽 한 면만 그려 바깥에서는 보이지 않는다(돌하우스 뷰). 천장도 위에서는 투명하다.
  return (
    <group name="ROOM_Shell">
      <mesh name="Floor" geometry={geos.floor} material={mats.floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={pick("floor")} />
      <mesh name="Slab" position={[0, -0.08, 0]}>
        <boxGeometry args={[w + 0.3, 0.15, d + 0.3]} />
        <meshStandardMaterial color="#6d7380" roughness={0.9} />
      </mesh>
      <mesh name="Ceiling" material={mats.ceiling} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} onClick={pick("ceiling")}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh name="Wall_N" geometry={geos.north} material={mats.wall} position={[0, h / 2, -d / 2]} receiveShadow onClick={pick("wall")} />
      <mesh name="Wall_S" geometry={geos.north} material={mats.wall} position={[0, h / 2, d / 2]} rotation={[0, Math.PI, 0]} onClick={pick("wall")} />
      <mesh name="Wall_E" geometry={geos.east} material={mats.wall} position={[w / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow onClick={pick("wall")} />
      <mesh name="Wall_W" geometry={geos.west} material={mats.wall} position={[-w / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow onClick={pick("wall")} />
      {/* 창: 창밖 하늘 면 + 프레임 */}
      <mesh name="Window_Sky" position={[w / 2 + 0.05, WINDOW.sill + WINDOW.h / 2, WINDOW.z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[WINDOW.w + 0.1, WINDOW.h + 0.1]} />
        <meshBasicMaterial ref={skyMat} color="#bfe0ff" toneMapped={false} />
      </mesh>
      {[
        [0, WINDOW.h / 2, WINDOW.w + 0.08, 0.05],
        [0, -WINDOW.h / 2, WINDOW.w + 0.08, 0.05],
        [-WINDOW.w / 2, 0, 0.05, WINDOW.h],
        [WINDOW.w / 2, 0, 0.05, WINDOW.h],
        [0, 0, 0.03, WINDOW.h],
      ].map(([u, v, bw, bh], i) => (
        <mesh key={i} position={[w / 2 - 0.02, WINDOW.sill + WINDOW.h / 2 + v, WINDOW.z + u]}>
          <boxGeometry args={[0.05, bh, bw]} />
          <meshStandardMaterial color="#f2f2f0" roughness={0.6} />
        </mesh>
      ))}
      {/* 문: 열린 개구부 안쪽의 문짝 */}
      <mesh name="Door_Leaf" position={[-w / 2 - 0.02, DOOR.h / 2, DOOR.z]}>
        <boxGeometry args={[0.04, DOOR.h, DOOR.w]} />
        <meshStandardMaterial color="#8b6b4a" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ───────── 가구 (절차적) ─────────
interface Part {
  k: "box" | "cyl";
  p: Vec3;
  /** box: [x,y,z] 크기 / cyl: [위 반지름, 높이, 아래 반지름] */
  s: Vec3;
  c?: string;
  glow?: boolean;
}
const PARTS: Record<FurnitureId, Part[]> = {
  sofa: [
    { k: "box", p: [0, 0.25, 0.05], s: [2.0, 0.4, 0.8] },
    { k: "box", p: [0, 0.62, -0.35], s: [2.0, 0.46, 0.2] },
    { k: "box", p: [-0.9, 0.45, 0.05], s: [0.2, 0.5, 0.8] },
    { k: "box", p: [0.9, 0.45, 0.05], s: [0.2, 0.5, 0.8] },
    { k: "box", p: [-0.4, 0.52, 0.1], s: [0.78, 0.14, 0.6], c: "#8da0b8" },
    { k: "box", p: [0.4, 0.52, 0.1], s: [0.78, 0.14, 0.6], c: "#8da0b8" },
  ],
  table: [
    { k: "box", p: [0, 0.42, 0], s: [1.2, 0.06, 0.7] },
    ...([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz): Part => ({ k: "box", p: [0.52 * sx, 0.195, 0.28 * sz], s: [0.06, 0.39, 0.06], c: "#4a4036" }))),
  ],
  rug: [{ k: "box", p: [0, 0.01, 0], s: [2.2, 0.02, 1.5] }],
  shelf: [
    { k: "box", p: [-0.435, 0.95, 0], s: [0.03, 1.9, 0.35] },
    { k: "box", p: [0.435, 0.95, 0], s: [0.03, 1.9, 0.35] },
    { k: "box", p: [0, 0.95, -0.16], s: [0.9, 1.9, 0.02] },
    ...[0.05, 0.45, 0.85, 1.25, 1.65, 1.885].map((y): Part => ({ k: "box", p: [0, y, 0], s: [0.84, 0.03, 0.33] })),
  ],
  lamp: [
    { k: "cyl", p: [0, 0.02, 0], s: [0.18, 0.04, 0.18] },
    { k: "cyl", p: [0, 0.8, 0], s: [0.015, 1.5, 0.015], c: "#2b303a" },
    { k: "cyl", p: [0, 1.45, 0], s: [0.14, 0.3, 0.2], c: "#f3e3b8", glow: true },
  ],
};

function PartMesh({ part, base, tint, segments, lampOn }: { part: Part; base: string; tint: string | null; segments: number; lampOn: boolean }) {
  const glow = part.glow && lampOn;
  return (
    <mesh position={part.p} castShadow receiveShadow>
      {part.k === "box" ? <boxGeometry args={part.s} /> : <cylinderGeometry args={[part.s[0], part.s[2], part.s[1], segments]} />}
      <meshStandardMaterial
        color={part.c ?? base}
        roughness={0.7}
        metalness={0.05}
        emissive={glow ? "#ffcf80" : (tint ?? "#000000")}
        emissiveIntensity={glow ? 1.4 : tint ? 0.35 : 0}
      />
    </mesh>
  );
}

function GlbFurniture({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={root} />;
}

function Furniture({
  spec, item, selected, overlap, segments, lampOn, reduced, onSelect,
}: {
  spec: FurnitureSpec; item: ItemState; selected: boolean; overlap: boolean; segments: number; lampOn: boolean; reduced: boolean; onSelect: (id: FurnitureId) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const rotY = item.rot * (Math.PI / 2);
  const tint = overlap ? DANGER_3D : selected ? ACCENT_3D : null;
  const url = MODEL_ASSET.furniture[spec.id];
  const procedural = PARTS[spec.id].map((part, i) => <PartMesh key={i} part={part} base={spec.color} tint={tint} segments={segments} lampOn={lampOn} />);

  // 이동은 부드럽게 따라가되, reduced-motion 이면 즉시 이동한다
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (reduced) g.position.set(item.x, 0, item.z);
    else {
      g.position.x = THREE.MathUtils.damp(g.position.x, item.x, 14, delta);
      g.position.z = THREE.MathUtils.damp(g.position.z, item.z, 14, delta);
    }
    g.rotation.y = reduced ? rotY : THREE.MathUtils.damp(g.rotation.y, rotY, 14, delta);
  });

  return (
    <group
      ref={group}
      name={spec.node}
      visible={item.placed}
      position={[item.x, 0, item.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spec.id);
      }}
    >
      {url ? (
        <Boundary fallback={<>{procedural}</>}>
          <Suspense fallback={null}>
            <GlbFurniture url={url} />
          </Suspense>
        </Boundary>
      ) : (
        procedural
      )}
      {spec.id === "lamp" && lampOn && item.placed && <pointLight position={[0, 1.4, 0]} color="#ffcf80" intensity={6} distance={6} decay={2} />}
    </group>
  );
}

// ───────── 방 GLB (선택) ─────────
function GlbRoom({ url, mats, onLoaded }: { url: string; mats: SurfaceMats; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const name = (Array.isArray(m.material) ? m.material[0] : m.material)?.name;
      if (name === "MAT_Floor") m.material = mats.floor;
      else if (name === "MAT_Wall") m.material = mats.wall;
      else if (name === "MAT_Ceiling") m.material = mats.ceiling;
    });
    onLoaded();
  }, [root, mats, onLoaded]);
  return <primitive object={root} />;
}

// ───────── 조명 (채광 프리셋, 부드럽게 보간) ─────────
const tmpColor = new THREE.Color();
const tmpVec = new THREE.Vector3();
function Lights({ preset, tier, reduced, skyMat }: { preset: DaylightPreset; tier: QualityTier; reduced: boolean; skyMat: MutableRefObject<THREE.MeshBasicMaterial | null> }) {
  const quality = QUALITY_PRESETS[tier];
  // 초기값만 prop 으로 넘기고 이후 변화는 useFrame 에서 보간한다(prop 변경이 보간을 덮어쓰지 않게)
  const [init] = useState(preset);
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const ceiling = useRef<THREE.PointLight>(null);
  useFrame(({ scene }, delta) => {
    const k = reduced ? 1 : 1 - Math.exp(-delta * 5);
    const L = THREE.MathUtils.lerp;
    if (ambient.current) ambient.current.intensity = L(ambient.current.intensity, preset.ambient, k);
    if (hemi.current) {
      hemi.current.intensity = L(hemi.current.intensity, preset.hemi, k);
      hemi.current.color.lerp(tmpColor.set(preset.hemiSky), k);
      hemi.current.groundColor.lerp(tmpColor.set(preset.hemiGround), k);
    }
    if (sun.current) {
      sun.current.intensity = L(sun.current.intensity, preset.sunIntensity, k);
      sun.current.color.lerp(tmpColor.set(preset.sun), k);
      sun.current.position.lerp(tmpVec.set(...preset.sunPosition), k);
    }
    if (ceiling.current) ceiling.current.intensity = L(ceiling.current.intensity, preset.lampOn ? 4 : 0, k);
    if (skyMat.current) skyMat.current.color.lerp(tmpColor.set(preset.sky), k);
    if (scene.background instanceof THREE.Color) scene.background.lerp(tmpColor.set(preset.background), k);
  });
  return (
    <>
      <color attach="background" args={[init.background]} />
      <ambientLight ref={ambient} intensity={init.ambient} />
      <hemisphereLight ref={hemi} args={[init.hemiSky, init.hemiGround, init.hemi]} />
      <directionalLight
        ref={sun}
        position={init.sunPosition}
        intensity={init.sunIntensity}
        color={init.sun}
        castShadow={quality.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <pointLight ref={ceiling} position={[0, ROOM.h - 0.2, 0]} color="#ffd9a0" intensity={0} distance={9} decay={2} />
      {quality.environment && (
        <Environment resolution={64} frames={1} environmentIntensity={preset.env}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
    </>
  );
}

// ───────── 카메라: Orbit ↔ Walkthrough ─────────
type Pose = { px: number; py: number; pz: number; tx: number; ty: number; tz: number };

function CameraRig({ state, actions, reduced, controlsRef }: { state: State; actions: Actions; reduced: boolean; controlsRef: MutableRefObject<ComponentRef<typeof OrbitControls> | null> }) {
  const { camera } = useThree();
  const [hx, hy, hz] = ORBIT_HOME.position;
  const [ox, oy, oz] = ORBIT_HOME.target;
  const cur = useRef<Pose>({ px: hx, py: hy, pz: hz, tx: ox, ty: oy, tz: oz });
  const owning = useRef(false);
  const first = useRef(true);
  const { viewMode, viewIndex } = state;
  const { animDone } = actions;

  // 시점 전환. 연타하면 이전 트윈을 끊고 현재 위치에서 다시 시작한다.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctl = controlsRef.current;
    if (!owning.current && ctl) {
      cur.current = { px: camera.position.x, py: camera.position.y, pz: camera.position.z, tx: ctl.target.x, ty: ctl.target.y, tz: ctl.target.z };
    }
    const dest = viewMode === "orbit" ? ORBIT_HOME : VIEWPOINTS[viewIndex];
    const pose: Pose = { px: dest.position[0], py: dest.position[1], pz: dest.position[2], tx: dest.target[0], ty: dest.target[1], tz: dest.target[2] };
    owning.current = true;
    const duration = reduced ? 0 : 1.1;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      Object.assign(cur.current, pose);
      if (viewMode === "orbit") {
        controlsRef.current?.target.set(pose.tx, pose.ty, pose.tz);
        owning.current = false;
      }
      animDone();
    };
    const tw = gsap.to(cur.current, { ...pose, duration, ease: "power3.inOut", onComplete: finish });
    // 저프레임·백그라운드 탭에서도 반드시 끝나도록 벽시계 데드라인을 둔다
    const deadline = window.setTimeout(() => {
      tw.kill();
      finish();
    }, duration * 1000 + 400);
    return () => {
      tw.kill();
      window.clearTimeout(deadline);
    };
  }, [viewMode, viewIndex, reduced, camera, controlsRef, animDone]);

  // 걷기 시점 좌우 둘러보기
  const lookN = state.look.n;
  const lookDir = state.look.dir;
  useEffect(() => {
    if (lookN === 0 || viewMode !== "walk") return;
    const c = cur.current;
    const vx = c.tx - c.px;
    const vz = c.tz - c.pz;
    const a = lookDir * LOOK_STEP;
    const nx = vx * Math.cos(a) - vz * Math.sin(a);
    const nz = vx * Math.sin(a) + vz * Math.cos(a);
    const tw = gsap.to(c, { tx: c.px + nx, tz: c.pz + nz, duration: reduced ? 0 : 0.4, ease: "power2.out" });
    return () => {
      tw.kill();
    };
  }, [lookN, lookDir, viewMode, reduced]);

  useFrame(() => {
    if (!owning.current) return;
    const c = cur.current;
    camera.position.set(c.px, c.py, c.pz);
    camera.lookAt(c.tx, c.ty, c.tz);
  });
  return null;
}

// ───────── 치수 라벨 (HTML) ─────────
function Dims({ config, selectedId }: { config: SceneConfig; selectedId: string | null }) {
  const tag = (text: string, pos: Vec3, key: string, strong = false) => (
    <Html key={key} position={pos} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
      <span className={styles.dimTag} data-strong={strong || undefined}>{text}</span>
    </Html>
  );
  return (
    <group>
      {tag(`${ROOM.w} m`, [0, 0.05, ROOM.d / 2 + 0.3], "rw")}
      {tag(`${ROOM.d} m`, [ROOM.w / 2 + 0.3, 0.05, 0], "rd")}
      {tag(`${ROOM.h} m`, [-ROOM.w / 2, ROOM.h / 2, ROOM.d / 2], "rh")}
      {FURNITURE.filter((f) => config.items[f.id].placed).map((f) => {
        const it = config.items[f.id];
        return tag(`${f.name} ${Math.round(f.w * 1000)}×${Math.round(f.d * 1000)}×${Math.round(f.h * 1000)}mm`, [it.x, f.h + 0.15, it.z], f.id, selectedId === f.id);
      })}
    </group>
  );
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier }: SceneProps) {
  const segments = tier === "low" ? 16 : 28;
  const { config, selectedId } = state;
  const preset = DAYLIGHT_BY_ID[config.daylight];
  const mats = useSurfaceMaterials(config, reduced);
  const skyMat = useRef<THREE.MeshBasicMaterial | null>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls> | null>(null);
  const overlaps = useMemo(() => findOverlaps(config), [config]);
  const frames = useRef({ sum: 0, n: 0 });
  const { ready, select, move, downgrade } = actions;

  const glbRoom = MODEL_ASSET.room;
  useEffect(() => {
    if (!glbRoom) ready();
  }, [glbRoom, ready]);

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 프레임 시간 모니터 → 자동 품질 하향(low 로)
  useFrame((_, delta) => {
    if (tier === "low" || delta >= 0.25) return;
    frames.current.sum += delta * 1000;
    if (++frames.current.n >= 90) {
      if (downgradeTier(tier, frames.current.sum / frames.current.n, 24) !== tier) downgrade();
      frames.current = { sum: 0, n: 0 };
    }
  });

  const placing = selectedId !== null && selectedId in config.items && config.items[selectedId as FurnitureId].placed;
  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (placing) {
      e.stopPropagation();
      move(selectedId as FurnitureId, e.point.x, e.point.z);
    }
  };

  const procedural = <Shell mats={mats} skyMat={skyMat} onSelectSurface={select} />;
  return (
    <>
      <Lights preset={preset} tier={tier} reduced={reduced} skyMat={skyMat} />
      <Boundary onError={ready} fallback={procedural}>
        <Suspense fallback={null}>{glbRoom ? <GlbRoom url={glbRoom} mats={mats} onLoaded={ready} /> : procedural}</Suspense>
      </Boundary>
      {/* 가구 배치용 보이지 않는 바닥: 클릭 위치를 Raycast 로 받는다 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} onClick={onFloorClick}>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {FURNITURE.map((f) => (
        <Furniture
          key={f.id}
          spec={f}
          item={config.items[f.id]}
          selected={selectedId === f.id}
          overlap={overlaps.has(f.id)}
          segments={segments}
          lampOn={preset.lampOn}
          reduced={reduced}
          onSelect={select}
        />
      ))}
      {state.showDims && <Dims config={config} selectedId={selectedId} />}
      <CameraRig state={state} actions={actions} reduced={reduced} controlsRef={controls} />
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={state.viewMode === "orbit" && !state.isAnimating && state.phase !== "loading"}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.47}
        target={ORBIT_HOME.target}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const active = useStageActive(wrap);
  const preset = QUALITY_PRESETS[props.tier];
  const { fail } = props.actions;
  return (
    <div ref={wrap} className={styles.canvasWrap}>
      <Boundary onError={fail}>
        <Canvas
          frameloop={active ? "always" : "never"}
          shadows={preset.shadows}
          dpr={clampDpr(preset.dpr)}
          camera={{ position: ORBIT_HOME.position, fov: ORBIT_HOME.fov, near: 0.1, far: 60 }}
          gl={{ antialias: props.tier !== "low", powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              fail("WebGL 컨텍스트가 손실되었습니다.");
            });
          }}
        >
          <SceneContent {...props} />
        </Canvas>
      </Boundary>
    </div>
  );
}
