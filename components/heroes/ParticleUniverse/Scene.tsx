"use client";

import { useEffect, useRef, useState, type ComponentRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AdditiveBlending, Plane, Vector2, Vector3 } from "three";
import { DPR_MAX_BY_TIER, clampDpr, detectQualityTier, type QualityTier } from "@/lib/hero/performance";
import {
  CAMERA,
  QUALITY_PRESETS,
  type HeroSettings,
  type HeroState,
  type HeroStats,
  type IntroRig,
  type PointerInput,
  type SceneCommands,
} from "./config";
import { buildParticles } from "./geometry";
import { createUniforms, setAccent, snapShape, startMorph, stepFrame } from "./sim";
import { fragmentShader, vertexShader } from "./shaders";

const AXIS_Y = new Vector3(0, 1, 0);
const NUDGE_RAD = Math.PI / 8;

export interface SceneProps {
  settings: HeroSettings;
  reducedMotion: boolean;
  active: boolean;
  state: HeroState;
  stateRef: RefObject<HeroState>;
  pointerRef: RefObject<PointerInput>;
  rig: RefObject<IntroRig>;
  commandsRef: RefObject<SceneCommands | null>;
  onReady: () => void;
  onError: () => void;
  onMorphDone: () => void;
  onStats: (stats: HeroStats) => void;
}

interface ParticlesProps extends SceneProps {
  tier: QualityTier;
  count: number;
  onDowngrade: (next: QualityTier) => void;
}

function Particles(props: ParticlesProps) {
  const { count, tier, settings, reducedMotion, stateRef, pointerRef, rig, onMorphDone, onStats, onDowngrade } = props;
  const [buffers] = useState(() => buildParticles(count));
  const [uniforms] = useState(() => createUniforms(settings.shape));
  const [tmp] = useState(() => ({ v2: new Vector2(), plane: new Plane(), dir: new Vector3(), hit: new Vector3() }));
  const groupRef = useRef<ComponentRef<"group">>(null);
  const { invalidate } = useThree();
  const latest = useRef({ settings, reducedMotion, onMorphDone, onStats, onDowngrade, tier });
  const lastShape = useRef(settings.shape);
  const fieldAmt = useRef(0);
  const monitor = useRef({ acc: 0, frames: 0, windows: 0 });
  const touchSet = useRef(false);

  useEffect(() => {
    latest.current = { settings, reducedMotion, onMorphDone, onStats, onDowngrade, tier };
    invalidate();
  });

  // 형태 변환: 세 형태의 가중치를 보간한다(중간에 바꿔도 튀지 않음). uMorphProgress는 연출용 0->1.
  useEffect(() => {
    if (lastShape.current === settings.shape) {
      snapShape(uniforms, settings.shape);
      latest.current.onMorphDone();
      return;
    }
    lastShape.current = settings.shape;
    if (reducedMotion) {
      snapShape(uniforms, settings.shape);
      invalidate();
      latest.current.onMorphDone();
      return;
    }
    return startMorph(uniforms, settings.shape, () => latest.current.onMorphDone());
  }, [settings.shape, reducedMotion, uniforms, invalidate]);

  useEffect(() => {
    setAccent(uniforms, settings.accent);
  }, [settings.accent, uniforms]);

  useFrame((state, rawDelta) => {
    const { settings: s, reducedMotion: reduced, tier: t } = latest.current;
    const out = stepFrame({
      u: uniforms,
      tmp,
      state,
      rawDelta,
      settings: s,
      reduced,
      tier: t,
      stage: stateRef.current,
      pointer: pointerRef.current,
      rig: rig.current,
      group: groupRef.current,
      field: fieldAmt,
      monitor: monitor.current,
      touchSet,
      count,
    });
    if (out) {
      latest.current.onStats(out.stats);
      if (out.downgrade) latest.current.onDowngrade(out.downgrade);
    }
  });

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.sphere, 3]} />
          <bufferAttribute attach="attributes-aSpiral" args={[buffers.spiral, 3]} />
          <bufferAttribute attach="attributes-aMark" args={[buffers.mark, 3]} />
          <bufferAttribute attach="attributes-aScatter" args={[buffers.scatter, 3]} />
          <bufferAttribute attach="attributes-aColor" args={[buffers.color, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.size, 1]} />
          <bufferAttribute attach="attributes-aSeed" args={[buffers.seed, 1]} />
        </bufferGeometry>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}

function Controls3D({ settings, reducedMotion, state, commandsRef }: SceneProps) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);
  const { camera, invalidate } = useThree();
  const interactive = state !== "loading" && state !== "intro";

  useEffect(() => {
    commandsRef.current = {
      nudge: (direction) => {
        const c = ref.current;
        if (!c) return;
        const off = camera.position.clone().sub(c.target).applyAxisAngle(AXIS_Y, direction * NUDGE_RAD);
        camera.position.copy(c.target).add(off);
        c.update();
        invalidate();
      },
    };
    return () => {
      commandsRef.current = null;
    };
  }, [camera, commandsRef, invalidate]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={interactive}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      enableZoom={false}
      // 자동회전은 사용자 조작 중(interacting)·모션 감소 시 중단. 댐핑과는 별개 상태.
      autoRotate={settings.autoRotate && state !== "interacting" && !reducedMotion && interactive}
      autoRotateSpeed={0.8 * settings.speed}
    />
  );
}

export default function Scene(props: SceneProps) {
  const { settings, reducedMotion, active, onReady, onError } = props;
  const [autoTier, setAutoTier] = useState<QualityTier>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "low" : detectQualityTier(),
  );
  const tier: QualityTier = settings.quality === "auto" ? autoTier : settings.quality;
  const count = QUALITY_PRESETS[tier].count;
  const dpr = clampDpr(DPR_MAX_BY_TIER[tier]);

  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
      dpr={dpr}
      camera={{ position: [0, 0, CAMERA.start], fov: CAMERA.fov, near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onError();
        });
        onReady();
      }}
    >
      <Particles key={count} {...props} tier={tier} count={count} onDowngrade={setAutoTier} />
      <Controls3D {...props} />
    </Canvas>
  );
}
