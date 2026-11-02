"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clampDpr, type QualityTier } from "@/lib/hero/performance";
import {
  CAMERA,
  HERO_COLORS,
  LAYERS,
  QUALITY_PRESETS,
  type FocusObject,
  type HeroSettings,
  type LayerDef,
} from "./config";
import { composeCamera, createPose, type InteractionInput } from "./useHeroInteraction";

export interface SceneProps {
  input: InteractionInput;
  settings: HeroSettings;
  tier: QualityTier;
  /** 포인터 카메라 범위 배율 (모바일 축소) */
  range: number;
  reduced: boolean;
  objects: FocusObject[];
  focusedId: string | null;
  onReady: (invalidate: () => void) => void;
  onError: () => void;
  onSelect: (id: string) => void;
  onFrameStats: (avgMs: number) => void;
}

// 결정적 의사난수 (SSR/재마운트에서도 같은 지형)
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRidge(seed: number, base: number, amp: number, segments: number): THREE.ShapeGeometry {
  const rand = mulberry32(seed);
  const width = 140;
  const p1 = rand() * 6;
  const p2 = rand() * 6;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -16);
  for (let i = 0; i <= segments; i++) {
    const x = -width / 2 + (i / segments) * width;
    const y =
      base + amp * (0.55 * Math.sin(x * 0.11 + p1) + 0.3 * Math.sin(x * 0.27 + p2) + 0.25 * (rand() - 0.5));
    shape.lineTo(x, y);
  }
  shape.lineTo(width / 2, -16);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function buildStars(count: number): THREE.BufferGeometry {
  const rand = mulberry32(7);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() - 0.5) * 120;
    pos[i * 3 + 1] = (rand() - 0.3) * 50;
    pos[i * 3 + 2] = -48 + rand() * 22; // -48 ~ -26 (깊이감 있는 별무리)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
}

const RIDGES: Record<string, { seed: number; base: number; amp: number }> = {
  far: { seed: 11, base: -1, amp: 8 },
  mid: { seed: 23, base: -4.5, amp: 6 },
  near: { seed: 41, base: -6.5, amp: 4 },
};

function Ridge({ def, segments }: { def: LayerDef; segments: number }) {
  const cfg = RIDGES[def.id];
  const geometry = useMemo(() => buildRidge(cfg.seed, cfg.base, cfg.amp, segments), [cfg, segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={def.color} />
    </mesh>
  );
}

function Backdrop({ stars, accent }: { stars: number; accent: string }) {
  const geometry = useMemo(() => buildStars(stars), [stars]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <points geometry={geometry}>
        <pointsMaterial color="#ffffff" size={0.16} sizeAttenuation fog={false} transparent opacity={0.8} />
      </points>
      <mesh position={[16, 12, -2]}>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} fog={false} />
      </mesh>
    </>
  );
}

function FocusMesh({
  obj,
  accent,
  active,
  speed,
  reduced,
  onSelect,
}: {
  obj: FocusObject;
  accent: string;
  active: boolean;
  speed: number;
  reduced: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    const m = ref.current;
    if (!m || reduced) return;
    const dt = Math.min(delta, 0.05) * speed;
    m.rotation.y += dt * 0.5;
    m.rotation.x += dt * 0.25;
  });
  return (
    <mesh
      ref={ref}
      position={obj.position}
      scale={active ? 1.25 : 1}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(obj.id);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      {obj.shape === "octahedron" && <octahedronGeometry args={[1.1]} />}
      {obj.shape === "icosahedron" && <icosahedronGeometry args={[1.0, 0]} />}
      {obj.shape === "torus" && <torusGeometry args={[0.8, 0.28, 16, 40]} />}
      <meshStandardMaterial
        color={accent}
        emissive={accent}
        emissiveIntensity={active ? 0.7 : 0.25}
        roughness={0.35}
        metalness={0.3}
        flatShading
      />
    </mesh>
  );
}

/** 프레임 시간 평균을 주기적으로 보고 (워밍업 프레임 제외). */
function PerfMonitor({ enabled, onStats }: { enabled: boolean; onStats: (avgMs: number) => void }) {
  const acc = useRef({ n: 0, sum: 0, warm: 0 });
  useFrame((_, delta) => {
    if (!enabled) return;
    const a = acc.current;
    if (a.warm < 45) {
      a.warm++;
      return;
    }
    if (delta > 0.25) return; // 탭 복귀 등 비정상 간격 제외
    a.sum += delta * 1000;
    if (++a.n >= 90) {
      onStats(a.sum / a.n);
      a.n = 0;
      a.sum = 0;
    }
  });
  return null;
}

function Rig({ props }: { props: SceneProps }) {
  const { input, settings, range, reduced, objects, focusedId, tier, onSelect } = props;
  const pose = useMemo(() => createPose(), []);
  const lightRef = useRef<THREE.PointLight>(null);
  const groups = useRef<Partial<Record<string, THREE.Group | null>>>({});
  const invalidate = useThree((s) => s.invalidate);
  const preset = QUALITY_PRESETS[tier];
  const accent = settings.accent;

  // 설정이 바뀌면 demand 모드에서도 한 프레임 그린다
  useEffect(() => {
    invalidate();
  }, [invalidate, settings, focusedId, tier, reduced, range]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    composeCamera(input, { intensity: settings.intensity, speed: settings.speed, range, reduced }, dt, pose);
    state.camera.position.set(pose.px, pose.py, pose.pz);
    state.camera.lookAt(pose.lx, pose.ly, pose.lz);

    // 레이어별 깊이 기반 변위: 가까운 층일수록 포인터 반대 방향으로 더 이동
    const amp = settings.displacement * settings.intensity * range * (reduced ? 0.6 : 1);
    for (const def of LAYERS) {
      const g = groups.current[def.id];
      if (!g) continue;
      g.position.x = -input.x * def.parallax * 2.2 * amp;
      g.position.y = -input.y * def.parallax * 1.2 * amp;
    }
    const l = lightRef.current;
    if (l) l.position.set(pose.px + input.x * 7 * range, pose.py + input.y * 4 * range + 1, pose.pz - 2);
  });

  return (
    <>
      <color attach="background" args={[HERO_COLORS.bg]} />
      {settings.fog && <fog attach="fog" args={[HERO_COLORS.bg, 16, 62]} />}
      <ambientLight intensity={0.7} />
      <pointLight ref={lightRef} color={accent} intensity={settings.light ? 160 : 0} decay={2} />
      {LAYERS.map((def) => (
        <group
          key={def.id}
          ref={(g) => {
            groups.current[def.id] = g;
          }}
          position={[0, 0, def.z]}
          visible={settings.layers[def.id]}
        >
          {def.id === "backdrop" && <Backdrop stars={preset.stars} accent={accent} />}
          {(def.id === "far" || def.id === "mid" || def.id === "near") && (
            <Ridge def={def} segments={preset.segments} />
          )}
          {def.id === "foreground" &&
            objects.map((o) => (
              // 오브젝트 좌표는 월드 기준이므로 그룹 z(+2)를 상쇄
              <group key={o.id} position={[0, 0, -def.z]}>
                <FocusMesh
                  obj={o}
                  accent={accent}
                  active={focusedId === o.id}
                  speed={settings.speed}
                  reduced={reduced}
                  onSelect={onSelect}
                />
              </group>
            ))}
        </group>
      ))}
      <PerfMonitor enabled={!reduced} onStats={props.onFrameStats} />
    </>
  );
}

function SceneImpl(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  return (
    <Canvas
      frameloop={props.reduced ? "demand" : "always"}
      dpr={clampDpr(preset.dprMax)}
      camera={{ fov: CAMERA.fov, near: 0.1, far: 140, position: [0, 0.4, CAMERA.baseZ] }}
      gl={{ antialias: preset.antialias, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      onCreated={(state) => {
        state.gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onError();
        });
        props.onReady(state.invalidate);
      }}
    >
      <Rig props={props} />
    </Canvas>
  );
}

const Scene = memo(SceneImpl);
export default Scene;
