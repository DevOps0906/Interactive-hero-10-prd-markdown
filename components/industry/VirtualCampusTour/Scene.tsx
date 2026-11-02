"use client";

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { ANIM_DEADLINE_MS, CAMERA, MODEL_ASSET, OVERVIEW, QUALITY_PRESETS, spaceShot, type CampusData, type Space, type SpaceId, type Vec3, type ViewMode } from "./config";
import styles from "./VirtualCampusTour.module.css";

export interface SceneProps {
  data: CampusData;
  selectedId: SpaceId | null;
  viewMode: ViewMode;
  shotKey: number;
  reduced: boolean;
  tier: QualityTier;
  onSelect: (id: SpaceId) => void;
  onArrive: (key: number) => void;
  onReady: () => void;
  onFail: (message: string) => void;
  onDowngrade: (tier: QualityTier) => void;
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

const WALL_H = 1.1;
const WALL_T = 0.1;

function spaceIdOf(obj: THREE.Object3D | null): SpaceId | null {
  for (let o = obj; o; o = o.parent) if (o.name.startsWith("room-")) return o.name.slice(5) as SpaceId;
  return null;
}

// ───────── 절차적 캠퍼스 모델 (GLB 없을 때). 그룹 이름 `room-<id>` 가 GLB 노드 계약과 같다. ─────────
function Room({ space, desks, onSelect }: { space: Space; desks: boolean; onSelect: (id: SpaceId) => void }) {
  const [w, d] = space.size;
  const deskPos = useMemo(() => {
    if (!desks) return [] as Vec3[];
    const cols = Math.max(2, Math.floor(w / 0.9));
    const rows = space.id === "lobby" ? 1 : 2;
    const out: Vec3[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([(c - (cols - 1) / 2) * 0.8, 0.28, (r - (rows - 1) / 2) * 0.9 + 0.2]);
    return out;
  }, [desks, w, space.id]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  const walls: [number, number, number, number][] = [
    [0, -d / 2, w, WALL_T],
    [-w / 2, 0, WALL_T, d],
    [w / 2, 0, WALL_T, d],
  ];
  return (
    <group
      name={`room-${space.id}`}
      position={space.position}
      onClick={(e) => { e.stopPropagation(); onSelect(space.id); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      <mesh position={[0, 0.06, 0]} receiveShadow name={`room-${space.id}-floor`}>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial color="#56627a" roughness={0.7} metalness={0.05} />
      </mesh>
      {walls.map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, WALL_H / 2, z]} castShadow>
          <boxGeometry args={[sx, WALL_H, sz]} />
          <meshStandardMaterial color="#7c8aa3" roughness={0.6} metalness={0.05} />
        </mesh>
      ))}
      {deskPos.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.55, 0.32, 0.4]} />
          <meshStandardMaterial color="#a9b4c8" roughness={0.55} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function ProceduralCampus({ data, desks, onSelect }: { data: CampusData; desks: boolean; onSelect: (id: SpaceId) => void }) {
  return (
    <>
      {data.spaces.map((s) => (
        <Room key={s.id} space={s} desks={desks} onSelect={onSelect} />
      ))}
    </>
  );
}

/** GLB 모델: MODEL_ASSET.url 이 있을 때만 마운트. 필수 노드가 없으면 던져서 절차적 모델로 폴백한다. */
function GlbCampus({ url, onSelect, onLoaded }: { url: string; onSelect: (id: SpaceId) => void; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    const missing = MODEL_ASSET.requiredNodes.filter((n) => !clone.getObjectByName(n));
    if (missing.length) throw new Error(`GLB 필수 노드 누락: ${missing.join(", ")}`);
    return clone;
  }, [scene]);
  useEffect(() => onLoaded(), [onLoaded]);
  return (
    <primitive
      object={root}
      onClick={(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
        const id = spaceIdOf(e.object);
        if (id) {
          e.stopPropagation();
          onSelect(id);
        }
      }}
    />
  );
}

function Label({ space, active, onSelect }: { space: Space; active: boolean; onSelect: (id: SpaceId) => void }) {
  return (
    <Html position={[space.position[0], 1.7, space.position[2]]} center zIndexRange={[10, 0]}>
      <button type="button" tabIndex={-1} className={styles.hotspot} data-active={active} onClick={() => onSelect(space.id)}>
        <span className={styles.hotDot} />
        {space.name}
      </button>
    </Html>
  );
}

function SelectionMarker({ space }: { space: Space | undefined }) {
  if (!space) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[space.position[0], 0.14, space.position[2]]} name="selection-marker">
      <planeGeometry args={[space.size[0] + 0.3, space.size[1] + 0.3]} />
      <meshBasicMaterial color="#3fd0bd" transparent opacity={0.4} depthWrite={false} />
    </mesh>
  );
}

// ───────── 장면 ─────────
function SceneContent({ data, selectedId, viewMode, shotKey, reduced, tier, onSelect, onArrive, onReady, onDowngrade }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, invalidate } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const goal = useRef({ pos: new THREE.Vector3(...OVERVIEW.position), target: new THREE.Vector3(...OVERVIEW.target), key: 0, active: false, since: 0 });
  const frames = useRef({ sum: 0, n: 0 });
  const glbUrl = MODEL_ASSET.url;
  const selected = data.spaces.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!glbUrl) onReady();
  }, [glbUrl, onReady]);

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전.
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 목표 카메라 설정(선택이 바뀌거나 전경/초기화 때). reduced-motion 이면 즉시 이동.
  useEffect(() => {
    const shot = selected ? spaceShot(selected) : OVERVIEW;
    const g = goal.current;
    g.pos.set(...shot.position);
    g.target.set(...shot.target);
    g.key = shotKey;
    const ctl = controls.current;
    if (reduced || shotKey === 0) {
      camera.position.copy(g.pos);
      if (ctl) {
        ctl.target.copy(g.target);
        ctl.update();
      }
      g.active = false;
      invalidate();
      if (shotKey !== 0) onArrive(shotKey);
    } else {
      g.active = true;
      g.since = performance.now();
    }
    // selected 는 shotKey 와 함께만 바뀐다(동일 렌더에서 갱신).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shotKey]);

  useFrame((_, delta) => {
    const g = goal.current;
    const ctl = controls.current;
    if (g.active && ctl) {
      const expired = performance.now() - g.since > ANIM_DEADLINE_MS - 200;
      const k = expired ? 1 : 1 - Math.exp(-4.5 * Math.min(delta, 0.1));
      camera.position.lerp(g.pos, k);
      ctl.target.lerp(g.target, k);
      ctl.update();
      if (camera.position.distanceTo(g.pos) < 0.04 && ctl.target.distanceTo(g.target) < 0.04) {
        g.active = false;
        onArrive(g.key);
      }
    }
    // 프레임 시간 모니터 → 자동 품질 하향
    if (delta < 0.25) {
      frames.current.sum += delta * 1000;
      if (++frames.current.n >= 90) {
        const next = downgradeTier(tier, frames.current.sum / frames.current.n, 22);
        if (next !== tier) onDowngrade(next);
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#b4c4e0", "#2a3040", 0.9]} />
      <directionalLight position={[5, 9, 6]} intensity={2} castShadow={quality.shadows} shadow-mapSize={[1024, 1024]} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={0.9}>
          <Lightformer form="rect" intensity={3} position={[0, 6, 2]} scale={[10, 4, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-6, 2, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow name="ground">
        <planeGeometry args={[26, 26]} />
        <meshStandardMaterial color="#2c3547" roughness={0.9} metalness={0} />
      </mesh>
      <Boundary onError={onReady} fallback={<ProceduralCampus data={data} desks={quality.desks} onSelect={onSelect} />}>
        <Suspense fallback={null}>
          {glbUrl ? <GlbCampus url={glbUrl} onSelect={onSelect} onLoaded={onReady} /> : <ProceduralCampus data={data} desks={quality.desks} onSelect={onSelect} />}
        </Suspense>
      </Boundary>
      <SelectionMarker space={selected} />
      {data.spaces.map((s) => (
        <Label key={s.id} space={s} active={s.id === selectedId} onSelect={onSelect} />
      ))}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={viewMode === "orbit"}
        enablePan={false}
        enableZoom={false}
        enableDamping={!reduced}
        minPolarAngle={CAMERA.minPolar}
        maxPolarAngle={CAMERA.maxPolar}
        onStart={() => {
          // 사용자가 직접 돌리면 자동 이동을 멈추고 도착으로 처리한다.
          const g = goal.current;
          if (g.active) {
            g.active = false;
            onArrive(g.key);
          }
        }}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabOn, setTabOn] = useState(true);

  // 화면 밖·탭 숨김이면 렌더 중단.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    io.observe(el);
    const onVis = () => setTabOn(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrap} className={styles.canvasWrap}>
      <Boundary onError={props.onFail}>
        <Canvas
          shadows={preset.shadows}
          dpr={clampDpr(preset.dpr)}
          frameloop={!(inView && tabOn) ? "never" : props.reduced ? "demand" : "always"}
          camera={{ position: OVERVIEW.position, fov: CAMERA.fov, near: 0.1, far: 80 }}
          gl={{ antialias: preset.antialias, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              props.onFail("WebGL 컨텍스트가 손실되었습니다.");
            });
          }}
        >
          <SceneContent {...props} />
        </Canvas>
      </Boundary>
    </div>
  );
}
