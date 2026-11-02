"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { clampDpr, DPR_MAX_BY_TIER, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { CAMERA_KEYS, explodeAmount, PRESETS, rotationAngle, smooth, type HeroSettings } from "./config";

type SceneProps = {
  progressRef: RefObject<number>;
  introRef: RefObject<number>;
  settings: HeroSettings;
  tier: QualityTier;
  onReady: () => void;
  onError: () => void;
  onSlow: (next: QualityTier) => void;
};

// 인터랙션 3: keyframe 사이를 smoothstep으로 보간
function sampleCamera(p: number, outPos: THREE.Vector3, outTarget: THREE.Vector3) {
  const keys = CAMERA_KEYS;
  let i = 0;
  while (i < keys.length - 2 && p > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const t = smooth(a.at, b.at, p);
  outPos.set(...a.position).lerp(new THREE.Vector3(...b.position), t);
  outTarget.set(...a.target).lerp(new THREE.Vector3(...b.target), t);
}

function CameraRig({ progressRef, introRef, speed }: Pick<SceneProps, "progressRef" | "introRef"> & { speed: number }) {
  const pos = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const size = useThree((s) => s.size);
  useFrame(({ camera }, delta) => {
    sampleCamera(progressRef.current, pos, target);
    const narrow = size.width / size.height < 1 ? 1.5 : 1; // 모바일 세로: 더 물러난다
    pos.multiplyScalar(narrow * (1 + (1 - introRef.current) * 0.5));
    const k = 1 - Math.exp(-6 * speed * delta);
    camera.position.lerp(pos, k);
    look.lerp(target, k);
    camera.lookAt(look);
  });
  return null;
}

function Model({ progressRef, settings, segments, detail }: { progressRef: RefObject<number>; settings: HeroSettings; segments: number; detail: number }) {
  const group = useRef<THREE.Group>(null);
  const panels = useRef<(THREE.Mesh | null)[]>([]);
  const core = useRef<THREE.Mesh>(null);
  const dirs = useMemo(
    () =>
      Array.from({ length: segments + 2 }, (_, i) => {
        if (i >= segments) return new THREE.Vector3(0, i === segments ? 1 : -1, 0);
        const a = (i / segments) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      }),
    [segments],
  );
  const panelGeo = useMemo(() => new THREE.BoxGeometry(Math.min(1.1, (Math.PI * 2.4) / segments), 0.9, 0.12), [segments]);
  const capGeo = useMemo(() => new THREE.CylinderGeometry(0.7, 0.7, 0.12, 24), []);
  const coreGeo = useMemo(() => new THREE.IcosahedronGeometry(0.62, detail), [detail]);
  useEffect(
    () => () => {
      panelGeo.dispose();
      capGeo.dispose();
      coreGeo.dispose();
    },
    [panelGeo, capGeo, coreGeo],
  );

  useFrame(({ clock }) => {
    const p = progressRef.current;
    const e = explodeAmount(p);
    if (group.current) group.current.rotation.y = rotationAngle(p) * settings.speed + clock.elapsedTime * 0.15 * settings.speed;
    if (core.current) core.current.scale.setScalar(1 + e * 0.25);
    dirs.forEach((d, i) => {
      const m = panels.current[i];
      if (!m) return;
      const base = i < segments ? 1.25 : 0.95;
      m.position.copy(d).multiplyScalar(base + e * 1.9 * settings.intensity);
      if (i < segments) m.rotation.set(0, -Math.atan2(d.z, d.x) + Math.PI / 2, e * 0.6 * (i % 2 ? 1 : -1));
    });
  });

  return (
    <group ref={group}>
      <mesh ref={core} geometry={coreGeo}>
        <meshStandardMaterial color={settings.accent} emissive={settings.accent} emissiveIntensity={0.8 * settings.intensity} flatShading />
      </mesh>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(m) => void (panels.current[i] = m)} geometry={i < segments ? panelGeo : capGeo}>
          <meshStandardMaterial color="#5d6b86" metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

// 성능 감시(프레임 시간 평균) + WebGL context 손실 처리
function Monitor({ tier, onSlow, onError }: Pick<SceneProps, "tier" | "onSlow" | "onError">) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ sum: 0, n: 0 });
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError();
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);
  useFrame((_, delta) => {
    const a = acc.current;
    a.sum += Math.min(delta, 0.25) * 1000;
    if (++a.n < 90) return;
    const next = downgradeTier(tier, a.sum / a.n);
    a.sum = 0;
    a.n = 0;
    if (next !== tier) onSlow(next);
  });
  return null;
}

export default function Scene({ progressRef, introRef, settings, tier, onReady, onError, onSlow }: SceneProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const preset = PRESETS[tier];

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => setInView(en.isIntersecting));
    io.observe(el);
    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div ref={wrap} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        key={preset.antialias ? "aa" : "noaa"}
        frameloop={inView && tabVisible ? "always" : "never"}
        dpr={clampDpr(DPR_MAX_BY_TIER[tier])}
        camera={{ fov: 42, position: [0, 0.6, 9], near: 0.1, far: 50 }}
        gl={{ antialias: preset.antialias, powerPreference: "high-performance" }}
        onCreated={onReady}
      >
        <ambientLight intensity={0.8} />
        <hemisphereLight args={["#9fb4d6", "#1a2030", 0.9]} />
        <Environment resolution={64} frames={1} environmentIntensity={settings.intensity}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={2} color={settings.accent} position={[4, 0, -3]} scale={4} />
        </Environment>
        <directionalLight position={[4, 5, 3]} intensity={1.4 * settings.intensity} />
        <pointLight position={[-4, -2, -3]} intensity={25} color={settings.accent} />
        <Model progressRef={progressRef} settings={settings} segments={preset.segments} detail={preset.detail} />
        <CameraRig progressRef={progressRef} introRef={introRef} speed={settings.speed} />
        <Monitor tier={tier} onSlow={onSlow} onError={onError} />
      </Canvas>
    </div>
  );
}
