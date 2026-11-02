"use client";

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ComponentRef, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Edges, Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, DPR_MAX_BY_TIER, type QualityTier } from "@/lib/hero/performance";
import { ACCENT, CAMERA, EXPLODE_GAP, FLOORS, FOOTPRINT, HOTSPOTS, MATERIALS, MODEL_ASSET, QUALITY_PRESETS, TIMES, TOUR_STEPS, VIEWS } from "./config";
import type { BlueprintActions, BlueprintState } from "./useBlueprint";
import type { FloorId, HotspotSpec } from "./types";
import styles from "./ArchitectureBlueprintReveal.module.css";

interface Entry {
  obj: THREE.Object3D;
  baseY: number;
}
type Registry = MutableRefObject<Partial<Record<FloorId, Entry>>>;

export interface SceneProps {
  state: BlueprintState;
  actions: BlueprintActions;
  reduced: boolean;
  tier: QualityTier;
  fpsRef: MutableRefObject<number>;
  /** 화면 밖·탭 숨김이면 false: 렌더 루프 중단 */
  active: boolean;
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

interface Mats {
  facade: THREE.MeshStandardMaterial;
  slab: THREE.MeshStandardMaterial;
  windows: THREE.MeshStandardMaterial;
}

// ───────── 절차적 건물 (GLB 가 없을 때). 그룹 이름 = FLOORS[].id, 외피 메시 = `<id>_facade` ─────────
function ProceduralFloor({ id, y, mats, registryRef, selected, onSelect }: { id: FloorId; y: number; mats: Mats; registryRef: Registry; selected: boolean; onSelect: (id: FloorId) => void }) {
  const reg = useCallback(
    (o: THREE.Group | null) => {
      if (o && registryRef.current[id]?.obj !== o) registryRef.current[id] = { obj: o, baseY: y };
    },
    [id, y, registryRef],
  );
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };
  const { w, d } = FOOTPRINT;
  return (
    <group name={id} ref={reg} position={[0, y, 0]} onClick={click}>
      <mesh name={`${id}_slab`} position={[0, id === "roof" ? 0.06 : 0.05, 0]} material={mats.slab} castShadow receiveShadow>
        <boxGeometry args={[w + 0.4, id === "roof" ? 0.12 : 0.1, d + 0.4]} />
      </mesh>
      {id === "roof" ? (
        <>
          <mesh name="roof_facade" position={[-0.9, 0.27, -0.4]} material={mats.facade} castShadow>
            <boxGeometry args={[0.8, 0.3, 0.6]} />
            {selected && <Edges color={ACCENT} />}
          </mesh>
          <mesh name="roof_garden" position={[0.6, 0.15, 0.2]}>
            <boxGeometry args={[1.2, 0.06, 1]} />
            <meshStandardMaterial color="#5c7a62" roughness={0.9} metalness={0} />
          </mesh>
        </>
      ) : (
        <>
          <mesh name={`${id}_facade`} position={[0, 0.425, 0]} material={mats.facade} castShadow receiveShadow>
            <boxGeometry args={[w, 0.65, d]} />
            {selected && <Edges color={ACCENT} />}
          </mesh>
          <mesh name={`${id}_windows`} position={[0, 0.43, 0]} material={mats.windows}>
            <boxGeometry args={[w + 0.02, 0.3, d + 0.02]} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** GLB: config.MODEL_ASSET.url 이 있을 때만 마운트. FLOORS[].id 이름의 노드를 층으로 등록한다. */
function GlbModel({ url, mats, registryRef, onSelect }: { url: string; mats: Mats; registryRef: Registry; onSelect: (id: FloorId) => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    const entries: Partial<Record<FloorId, Entry>> = {};
    for (const f of FLOORS) {
      const obj = root.getObjectByName(f.id);
      if (obj) entries[f.id] = { obj, baseY: obj.position.y };
    }
    root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh && m.name.endsWith("_facade")) m.material = mats.facade;
    });
    registryRef.current = entries;
    return () => {
      registryRef.current = {};
    };
  }, [root, mats, registryRef]);
  const click = (e: ThreeEvent<MouseEvent>) => {
    let o: THREE.Object3D | null = e.object;
    while (o) {
      const hit = FLOORS.find((f) => f.id === o!.name);
      if (hit) {
        e.stopPropagation();
        onSelect(hit.id);
        return;
      }
      o = o.parent;
    }
  };
  return <primitive object={root} onClick={click} />;
}

// ───────── 핫스팟 (스테이지는 aria-hidden: 키보드 경로는 패널의 핫스팟 목록) ─────────
function Hotspot({ spot, registryRef, active, visible, onSelect }: { spot: HotspotSpec; registryRef: Registry; active: boolean; visible: boolean; onSelect: (id: HotspotSpec["id"]) => void }) {
  const group = useRef<THREE.Group>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useFrame(() => {
    const e = registryRef.current[spot.floor];
    if (!group.current || !btn.current || !e) return;
    group.current.position.set(spot.offset[0], e.obj.position.y + spot.offset[1], spot.offset[2]);
    const show = visible && e.obj.visible;
    btn.current.style.opacity = show ? "1" : "0";
    btn.current.style.pointerEvents = show ? "auto" : "none";
  });
  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]}>
        <button ref={btn} type="button" tabIndex={-1} className={styles.hotspot} data-active={active} onClick={() => onSelect(spot.id)} style={{ opacity: 0 }}>
          <span aria-hidden="true" className={styles.hotDot} />
          <span>{spot.label}</span>
        </button>
      </Html>
    </group>
  );
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier, fpsRef }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, size } = useThree();
  const root = useRef<THREE.Group>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const registryRef: Registry = useRef({});
  const morphK = useRef({ k: 0 });
  const offsets = useRef<Record<FloorId, number>>({ floor_01: 0, floor_02: 0, floor_03: 0, floor_04: 0, roof: 0 });
  const light = useRef({ sun: TIMES[0].sun, hemi: TIMES[0].hemi, amb: TIMES[0].ambient, env: TIMES[0].env, win: TIMES[0].windows });
  const frames = useRef({ sum: 0, n: 0 });
  const busy = useRef(0);

  const { phase, selectedId, viewMode, tourStep, homeN } = state;
  const { exploded, material, prevMaterial, compare, time } = state.config;

  const mats = useMemo<Mats>(() => {
    const m0 = MATERIALS[0];
    return {
      facade: new THREE.MeshStandardMaterial({ color: m0.color, roughness: m0.roughness, metalness: m0.metalness }),
      slab: new THREE.MeshStandardMaterial({ color: "#6b7385", roughness: 0.8, metalness: 0.05 }),
      windows: new THREE.MeshStandardMaterial({ color: "#2a3a55", roughness: 0.15, metalness: 0.1, emissive: "#ffcf85", emissiveIntensity: TIMES[0].windows }),
    };
  }, []);
  const matsRef = useRef<Mats | null>(null);
  useEffect(() => {
    matsRef.current = mats;
    return () => Object.values(mats).forEach((m) => m.dispose());
  }, [mats]);

  // 애니메이션 진행 중 표시(isAnimating): 겹치는 트윈은 카운터로 합산, 정리 시 반드시 해제
  const tween = useCallback(
    (target: object, vars: gsap.TweenVars, onDone?: () => void) => {
      if (busy.current++ === 0) actions.animating(true);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (--busy.current === 0) actions.animating(false);
      };
      const tw = gsap.to(target, {
        ...vars,
        duration: reduced ? 0 : (vars.duration ?? 0.8),
        onComplete: () => {
          finish();
          onDone?.();
        },
      });
      return () => {
        tw.kill();
        finish();
      };
    },
    [actions, reduced],
  );

  // 뷰포트 비율에 맞춰 스케일(좁은 화면 잘림 방지)
  useEffect(() => {
    root.current?.scale.setScalar(THREE.MathUtils.clamp((size.width / size.height) * 1.15, 0.62, 1.05));
  }, [size.width, size.height]);

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 인터랙션 1: 도면 → 3D 전환 (morphK 0→1, 층이 위에서 내려앉는다)
  useEffect(() => {
    if (phase === "blueprint") {
      morphK.current.k = 0;
      return;
    }
    if (phase === "morphing") {
      const tw = gsap.to(morphK.current, { k: 1, duration: reduced ? 0 : CAMERA.morphDuration, ease: "power3.out", onComplete: actions.ready });
      return () => {
        tw.kill();
      };
    }
    morphK.current.k = 1;
  }, [phase, reduced, actions]);

  // 인터랙션 2·7: 카메라 뷰 / 투어 장면 이동
  useEffect(() => {
    const pose = tourStep >= 0 ? TOUR_STEPS[Math.min(tourStep, TOUR_STEPS.length - 1)] : null;
    const pos = pose ? pose.position : VIEWS[viewMode === "tour" ? "iso" : viewMode].position;
    const tgt = pose ? pose.target : CAMERA.target;
    const stops: Array<() => void> = [tween(camera.position, { x: pos[0], y: pos[1], z: pos[2], duration: 1.2, ease: "power3.inOut" })];
    const t = controls.current?.target;
    if (t) stops.push(tween(t, { x: tgt[0], y: tgt[1], z: tgt[2], duration: 1.2, ease: "power3.inOut" }));
    return () => stops.forEach((s) => s());
  }, [viewMode, tourStep, homeN, camera, tween]);

  // 인터랙션 3: 선택 층 위쪽을 띄운다. 층별 오프셋을 한 트윈으로 보간해 선택 변경 중에도 튀지 않는다.
  useEffect(() => {
    const pivot = selectedId ? FLOORS.findIndex((f) => f.id === selectedId) : 0;
    const target = {} as Record<FloorId, number>;
    FLOORS.forEach((f, i) => (target[f.id] = exploded && i > pivot ? (i - pivot) * EXPLODE_GAP : 0));
    return tween(offsets.current, { ...target, duration: 1.0, ease: "power3.inOut" });
  }, [exploded, selectedId, tween]);

  // 인터랙션 4: 재질 (비교 토글이면 직전 재질)
  const shown = MATERIALS.find((m) => m.id === (compare ? prevMaterial : material)) ?? MATERIALS[0];
  useEffect(() => {
    const c = new THREE.Color(shown.color);
    const metal = quality.environment ? shown.metalness : Math.min(shown.metalness, 0.15);
    const stopColor = tween(mats.facade.color, { r: c.r, g: c.g, b: c.b, duration: 0.6 });
    const stopRest = tween(mats.facade, { roughness: shown.roughness, metalness: metal, duration: 0.6 });
    return () => {
      stopColor();
      stopRest();
    };
  }, [shown, quality.environment, mats, tween]);

  // 인터랙션 5: 주야 조명
  useEffect(() => {
    const t = TIMES.find((x) => x.id === time) ?? TIMES[0];
    return tween(light.current, { sun: t.sun, hemi: t.hemi, amb: t.ambient, env: t.env, win: t.windows, duration: 0.9, ease: "power2.inOut" });
  }, [time, tween]);

  const select = actions.select;
  const hotspot = actions.hotspot;

  useFrame(({ scene: sc }, delta) => {
    const k = morphK.current.k;
    FLOORS.forEach((f, i) => {
      const e = registryRef.current[f.id];
      if (!e) return;
      const stagger = THREE.MathUtils.clamp(k * 1.5 - i * 0.12, 0, 1);
      const drop = (1 - stagger) ** 2 * (1.6 + i * 0.5);
      e.obj.position.y = e.baseY + offsets.current[f.id] + drop;
      e.obj.visible = stagger > 0.001;
    });
    const L = light.current;
    if (sun.current) sun.current.intensity = L.sun;
    if (hemi.current) hemi.current.intensity = L.hemi;
    if (amb.current) amb.current.intensity = L.amb;
    sc.environmentIntensity = L.env;
    if (matsRef.current) matsRef.current.windows.emissiveIntensity = L.win;

    if (phase === "ready" && delta < 0.25) {
      frames.current.sum += delta * 1000;
      if (++frames.current.n >= 60) {
        const avg = frames.current.sum / frames.current.n;
        fpsRef.current = 1000 / avg;
        const next = downgradeTier(tier, avg, 22);
        if (next !== tier) actions.downgrade(next);
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  const ready = phase === "ready";
  return (
    <>
      <ambientLight ref={amb} intensity={0.5} />
      <hemisphereLight ref={hemi} args={["#a9bbd8", "#1a2030", 0.9]} />
      <directionalLight ref={sun} position={[5, 8, 4]} intensity={2.6} castShadow={quality.shadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} />
      {quality.environment && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={1.5} color={ACCENT} position={[4, 0, -3]} scale={4} />
        </Environment>
      )}
      <group ref={root}>
        <Boundary
          fallback={FLOORS.map((f) => (
            <ProceduralFloor key={f.id} id={f.id} y={f.y} mats={mats} registryRef={registryRef} selected={selectedId === f.id} onSelect={select} />
          ))}
        >
          <Suspense fallback={null}>
            {MODEL_ASSET.url ? (
              <GlbModel url={MODEL_ASSET.url} mats={mats} registryRef={registryRef} onSelect={select} />
            ) : (
              FLOORS.map((f) => <ProceduralFloor key={f.id} id={f.id} y={f.y} mats={mats} registryRef={registryRef} selected={selectedId === f.id} onSelect={select} />)
            )}
          </Suspense>
        </Boundary>
        {HOTSPOTS.map((h) => (
          <Hotspot key={h.id} spot={h} registryRef={registryRef} active={state.hotspotId === h.id} visible={ready} onSelect={hotspot} />
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
          <circleGeometry args={[4.2, 48]} />
          <meshStandardMaterial color="#2b3344" roughness={0.95} metalness={0} />
        </mesh>
      </group>
      {/* 인터랙션 2: 이동 금지, 극각·거리 제한, 휠 줌 끔 */}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={ready && !state.isAnimating}
        enablePan={false}
        enableZoom={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={CAMERA.minPolar}
        maxPolarAngle={CAMERA.maxPolar}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  const { fail } = props.actions;
  return (
    <Boundary onError={fail}>
      <Canvas
        frameloop={props.active ? "always" : "never"}
        shadows={preset.shadows}
        dpr={clampDpr(DPR_MAX_BY_TIER[props.tier])}
        camera={{ position: [...VIEWS.iso.position], fov: CAMERA.fov, near: 0.1, far: 60 }}
        gl={{ antialias: preset.antialias, alpha: true, powerPreference: "high-performance" }}
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
  );
}
