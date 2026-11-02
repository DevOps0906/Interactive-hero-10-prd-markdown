"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ElementRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { CAMERA, EXPLODE, MATERIALS, MATERIAL_IDS, MODEL_ASSET, PARTS, QUALITY, SPIN_MS, VIEWS, colorOf } from "./config";
import { makeTexture } from "./textures";
import { buildHeel, buildLaces, buildShell, buildSole } from "./geometry";
import type { Actions, State } from "./useConfigurator";
import type { MaterialId, PartId } from "./types";
import styles from "./SneakerConfigurator.module.css";

const PART_IDS = PARTS.map((p) => p.id);
type Mats = Record<PartId, THREE.MeshStandardMaterial>;
type Register = (id: PartId, g: THREE.Group | null) => void;
type Pick = (id: PartId, e: { stopPropagation(): void }) => void;

export interface SceneProps {
  state: State;
  actions: Actions;
  reduced: boolean;
  tier: QualityTier;
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

// ───────── 모델 ─────────
function ProceduralParts({ mats, register, onPick }: { mats: Mats; register: Register; onPick: Pick }) {
  const geos = useMemo(() => ({ upper: buildShell(), sole: buildSole(), laces: buildLaces(), heel: buildHeel() }), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);
  return (
    <>
      {PART_IDS.map((id) => (
        <group key={id} ref={(g) => register(id, g)} onClick={(e) => onPick(id, e)}>
          <mesh name={id} geometry={geos[id]} material={mats[id]} />
        </group>
      ))}
    </>
  );
}

function GltfParts({ mats, register, onPick }: { mats: Mats; register: Register; onPick: Pick }) {
  const gltf = useGLTF(MODEL_ASSET.url as string);
  const nodes = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const found = {} as Record<PartId, THREE.Object3D>;
    const missing: string[] = [];
    for (const id of PART_IDS) {
      const n = scene.getObjectByName(MODEL_ASSET.nodes[id]);
      if (n) found[id] = n;
      else missing.push(MODEL_ASSET.nodes[id]);
    }
    if (missing.length) throw new Error(`GLB 노드 누락: ${missing.join(", ")}`);
    return found;
  }, [gltf]);
  useEffect(() => {
    for (const id of PART_IDS) nodes[id].traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).material = mats[id]) : undefined));
  }, [nodes, mats]);
  return (
    <>
      {PART_IDS.map((id) => (
        <group key={id} ref={(g) => register(id, g)} onClick={(e) => onPick(id, e)}>
          <primitive object={nodes[id]} />
        </group>
      ))}
    </>
  );
}

function applyConfig(mats: Mats, textures: Record<MaterialId, THREE.CanvasTexture>, config: State["config"]) {
  const spec = MATERIALS[config.material];
  for (const id of PART_IDS) mats[id].color.set(colorOf(config.colors[id]).hex);
  const u = mats.upper;
  u.roughness = spec.roughness;
  u.map = textures[config.material];
  u.bumpMap = textures[config.material];
  u.bumpScale = spec.bump;
  u.needsUpdate = true;
}

function applyHighlight(mats: Mats, selected: PartId) {
  for (const id of PART_IDS) {
    mats[id].emissive.set(id === selected ? "#2a9d8f" : "#000000");
    mats[id].emissiveIntensity = id === selected ? 0.16 : 0;
  }
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

function SceneContent({ state, actions, reduced, tier }: SceneProps) {
  const { camera, invalidate } = useThree();
  const preset = QUALITY[tier];
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const spinGroup = useRef<THREE.Group>(null);
  const partGroups = useRef<Partial<Record<PartId, THREE.Group>>>({});
  const tween = useRef<{ from: THREE.Vector3; to: THREE.Vector3; start: number } | null>(null);
  const spinStart = useRef<number | null>(null);
  const skipTween = useRef(false);
  const busy = useRef(false);
  const readySent = useRef(false);
  const frames = useRef({ n: 0, sum: 0, tier });

  const { config, exploded, selectedId, viewMode, spinN } = state;
  const started = state.phase !== "loading";

  // 재질·텍스처: 한 번 만들고 언마운트 때 해제
  const mats = useMemo<Mats>(
    () => ({
      upper: new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }),
      sole: new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0 }),
      laces: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }),
      heel: new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 }),
    }),
    [],
  );
  const textures = useMemo(() => Object.fromEntries(MATERIAL_IDS.map((m) => [m, makeTexture(m, MATERIALS[m].repeat)])) as Record<MaterialId, THREE.CanvasTexture>, []);
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(textures).forEach((t) => t.dispose());
    },
    [mats, textures],
  );

  // config → 재질 (HTML 패널과 같은 상태에서 파생)
  useEffect(() => {
    applyConfig(mats, textures, config);
    invalidate();
  }, [config, mats, textures, invalidate]);

  useEffect(() => {
    applyHighlight(mats, selectedId);
    invalidate();
  }, [selectedId, mats, invalidate]);
  const register = useCallback<Register>((id, g) => {
    if (g) partGroups.current[id] = g;
    else delete partGroups.current[id];
  }, []);
  const onPick = useCallback<Pick>(
    (id, e) => {
      e.stopPropagation();
      actions.select(id);
    },
    [actions],
  );

  // 인트로/360° 회전: 벽시계 데드라인으로 반드시 끝낸다
  useEffect(() => {
    if (!started) return;
    if (reduced) {
      spinStart.current = null;
      if (spinGroup.current) spinGroup.current.rotation.y = 0;
      actions.introDone();
      invalidate();
      return;
    }
    spinStart.current = performance.now();
    const id = window.setTimeout(() => {
      spinStart.current = null;
      if (spinGroup.current) spinGroup.current.rotation.y = 0;
      actions.introDone();
      invalidate();
    }, SPIN_MS + 300);
    return () => window.clearTimeout(id);
  }, [started, spinN, reduced, actions, invalidate]);

  // 로딩 데드라인: 최대 4초 뒤에는 로딩 표시를 걷는다
  useEffect(() => {
    const id = window.setTimeout(() => actions.ready(), 4000);
    return () => window.clearTimeout(id);
  }, [actions]);

  // 각도 프리셋
  useEffect(() => {
    if (skipTween.current) {
      skipTween.current = false;
      return;
    }
    const v = VIEWS.find((x) => x.id === viewMode);
    if (!v) return;
    const to = new THREE.Vector3(...v.pos);
    if (reduced) {
      camera.position.copy(to);
      controls.current?.update();
      invalidate();
      return;
    }
    if (camera.position.distanceTo(to) < 0.02) return;
    tween.current = { from: camera.position.clone(), to, start: performance.now() };
    invalidate();
  }, [viewMode, reduced, camera, invalidate]);

  useEffect(() => {
    invalidate();
  }, [exploded, invalidate]);

  useFrame((_, dt) => {
    if (!readySent.current && frames.current.n >= 2) {
      readySent.current = true;
      actions.ready();
    }
    const now = performance.now();
    let moving = false;

    const sg = spinGroup.current;
    if (sg && spinStart.current !== null) {
      const p = Math.min(1, (now - spinStart.current) / SPIN_MS);
      sg.rotation.y = (1 - easeOutCubic(p)) * Math.PI * 2;
      if (p < 1) moving = true;
      else spinStart.current = null;
    }

    const k = reduced ? 1 : 1 - Math.exp(-dt * 7);
    for (const id of PART_IDS) {
      const g = partGroups.current[id];
      if (!g) continue;
      const t = exploded ? EXPLODE[id] : [0, 0, 0];
      const dx = t[0] - g.position.x;
      const dy = t[1] - g.position.y;
      const dz = t[2] - g.position.z;
      if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) > 0.004) {
        g.position.set(g.position.x + dx * k, g.position.y + dy * k, g.position.z + dz * k);
        moving = true;
      } else g.position.set(t[0], t[1], t[2]);
    }

    const tw = tween.current;
    if (tw) {
      const p = Math.min(1, (now - tw.start) / CAMERA.tweenMs);
      camera.position.lerpVectors(tw.from, tw.to, easeInOut(p));
      controls.current?.update();
      if (p >= 1) tween.current = null;
      else moving = true;
    }

    if (moving !== busy.current) {
      busy.current = moving;
      actions.setAnimating(moving);
    }
    if (moving && reduced) invalidate();

    // 프레임 모니터: 워밍업 60프레임 뒤 120프레임 평균이 예산을 넘으면 등급을 낮춘다
    const f = frames.current;
    f.n++;
    if (f.n > 60 && f.tier !== "low") {
      f.sum += dt * 1000;
      if (f.n === 180) {
        const next = downgradeTier(f.tier, f.sum / 120);
        if (next !== f.tier) {
          f.tier = next;
          actions.downgrade(next);
        }
        f.n = 60;
        f.sum = 0;
      }
    }
  });

  return (
    <>
      <hemisphereLight args={["#ffffff", "#9aa4b5", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <Environment resolution={preset.env} frames={1} environmentIntensity={1.1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 2, 3]} rotation={[0, -Math.PI / 2, 0]} scale={[5, 2, 1]} />
      </Environment>

      <group ref={spinGroup}>
        <group position={[0, 0.2, 0]}>
          <Boundary fallback={<ProceduralParts mats={mats} register={register} onPick={onPick} />} onError={(m) => console.warn("[SneakerConfigurator]", m)}>
            {MODEL_ASSET.url ? (
              <Suspense fallback={null}>
                <GltfParts mats={mats} register={register} onPick={onPick} />
              </Suspense>
            ) : (
              <ProceduralParts mats={mats} register={register} onPick={onPick} />
            )}
          </Boundary>
        </group>
      </group>
      {preset.shadow ? <ContactShadows position={[0, -0.05, 0]} opacity={0.4} scale={9} blur={2.6} far={1.6} resolution={512} frames={1} /> : null}

      <OrbitControls
        ref={controls}
        makeDefault
        target={CAMERA.target}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={0.05}
        maxPolarAngle={Math.PI * 0.55}
        onStart={() => {
          tween.current = null;
          if (viewMode !== "free") {
            skipTween.current = true;
            actions.setView("free");
          }
        }}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const { actions } = props;
  const visible = inView && tabVisible;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // 렌더가 멈추면 진행 중 애니메이션 표시도 끈다(멈춘 채 "이동 중"으로 남지 않게)
  useEffect(() => {
    if (!visible) actions.setAnimating(false);
  }, [visible, actions]);

  const preset = QUALITY[props.tier];
  return (
    <div ref={wrap} className={styles.canvasWrap}>
      <Boundary onError={actions.fail}>
        <Canvas
          key={props.state.retryN}
          frameloop={!visible ? "never" : props.reduced ? "demand" : "always"}
          dpr={clampDpr(preset.dpr)}
          camera={{ position: CAMERA.free, fov: CAMERA.fov, near: 0.1, far: 60 }}
          gl={{ antialias: preset.aa, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.style.touchAction = "pan-y";
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              actions.fail("WebGL 컨텍스트가 손실되었습니다.");
            });
          }}
        >
          <SceneContent {...props} />
        </Canvas>
      </Boundary>
    </div>
  );
}
