"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { CAMERA, MODEL_ASSET, QUALITY_PRESETS, type PartId, type PartSpec, type ProductData } from "./config";
import type { HeroActions, HeroState } from "./useHeroInteraction";
import styles from "./ProductExperience3D.module.css";

interface PartEntry {
  obj: THREE.Object3D;
  base: THREE.Vector3;
  scale: number;
}
type Registry = MutableRefObject<Partial<Record<PartId, PartEntry>>>;

export interface SceneProps {
  state: HeroState;
  actions: HeroActions;
  reduced: boolean;
  tier: QualityTier;
  fpsRef: MutableRefObject<number>;
  product: ProductData;
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
const darkProps = { color: "#12151b", roughness: 0.55, metalness: 0.3 } as const;

function PartMaterial({ role, mat, accent }: { role: PartSpec["role"]; mat: THREE.Material; accent: string }) {
  if (role === "finish") return <primitive object={mat} attach="material" />;
  if (role === "glow") return <meshStandardMaterial color="#0d2a2a" emissive={accent} emissiveIntensity={1.6} roughness={0.4} />;
  return <meshStandardMaterial {...darkProps} />;
}

/** 절차적 제품 모델 (GLB 자산이 없을 때). 부품 이름·구조는 config.parts 와 동일. */
function ProceduralModel({ product, mat, registryRef, segments }: { product: ProductData; mat: THREE.Material; registryRef: Registry; segments: number }) {
  const reg = (id: PartId) => (o: THREE.Group | null) => {
    if (o && registryRef.current[id]?.obj !== o) registryRef.current[id] = { obj: o, base: o.position.clone(), scale: 1 };
  };
  const geo: Record<PartId, ReactNode> = {
    base: <cylinderGeometry args={[1.15, 1.2, 0.22, segments]} />,
    board: <boxGeometry args={[1.3, 0.06, 1.3]} />,
    driver: <cylinderGeometry args={[0.7, 0.55, 0.3, segments]} />,
    shell: <cylinderGeometry args={[0.98, 1, 1.8, segments, 1, true]} />,
    ring: <torusGeometry args={[1.0, 0.035, 12, segments]} />,
    cap: <cylinderGeometry args={[0.96, 0.96, 0.12, segments]} />,
  };
  return (
    <>
      {product.parts.map((p) => (
        <group key={p.id} ref={reg(p.id)} position={p.position} name={p.node}>
          <mesh castShadow rotation={p.id === "ring" ? [Math.PI / 2, 0, 0] : undefined}>
            {geo[p.id]}
            <PartMaterial role={p.role} mat={mat} accent={product.accent} />
          </mesh>
          {p.id === "driver" && (
            <mesh position={[0, 0.17, 0]}>
              <cylinderGeometry args={[0.25, 0.45, 0.12, segments]} />
              <meshStandardMaterial color="#1b2028" roughness={0.3} metalness={0.8} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

/** GLB 모델: config.MODEL_ASSET.url 이 있을 때만 마운트. PartSpec.node 이름의 노드를 부품으로 등록한다. */
function GlbModel({ url, product, mat, registryRef, onLoaded }: { url: string; product: ProductData; mat: THREE.Material; registryRef: Registry; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    const entries: Partial<Record<PartId, PartEntry>> = {};
    for (const p of product.parts) {
      const obj = root.getObjectByName(p.node);
      if (!obj) continue;
      entries[p.id] = { obj, base: obj.position.clone(), scale: obj.scale.x };
      if (p.role === "finish") obj.traverse((c) => ((c as THREE.Mesh).isMesh ? ((c as THREE.Mesh).material = mat) : undefined));
    }
    registryRef.current = entries;
    onLoaded();
    return () => {
      registryRef.current = {};
    };
  }, [root, product, mat, registryRef, onLoaded]);
  return <primitive object={root} />;
}

// ───────── 핫스팟 (월드 좌표 라벨, 뒷면이면 숨김) ─────────
const tmpPos = new THREE.Vector3();
const tmpNormal = new THREE.Vector3();
const tmpView = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

function Hotspot({ part, registryRef, yaw, active, visible, onSelect }: { part: PartSpec; registryRef: Registry; yaw: MutableRefObject<THREE.Group | null>; active: boolean; visible: boolean; onSelect: (id: PartId) => void }) {
  const group = useRef<THREE.Group>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useFrame(({ camera }) => {
    const entry = registryRef.current[part.id];
    if (!group.current || !btn.current || !entry || !yaw.current) return;
    group.current.position.set(entry.obj.position.x + part.hotspot.offset[0], entry.obj.position.y + part.hotspot.offset[1], entry.obj.position.z + part.hotspot.offset[2]);
    group.current.getWorldPosition(tmpPos);
    yaw.current.getWorldQuaternion(tmpQuat);
    tmpNormal.set(...part.hotspot.normal).applyQuaternion(tmpQuat);
    tmpView.copy(camera.position).sub(tmpPos).normalize();
    const show = visible && tmpNormal.dot(tmpView) > 0.05;
    btn.current.style.opacity = show ? "1" : "0";
    btn.current.style.pointerEvents = show ? "auto" : "none";
  });
  return (
    <group ref={group}>
      <Html center zIndexRange={[20, 0]}>
        {/* 스테이지는 aria-hidden: 키보드·스크린리더 경로는 패널의 부품 목록이다 */}
        <button ref={btn} type="button" tabIndex={-1} className={styles.hotspot} data-active={active} onClick={() => onSelect(part.id)} style={{ opacity: 0 }}>
          <span aria-hidden="true" className={styles.hotDot} />
          <span className={styles.hotLabel}>{part.name}</span>
        </button>
      </Html>
    </group>
  );
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier, fpsRef, product }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, size } = useThree();
  const yaw = useRef<THREE.Group>(null);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const rimLight = useRef<THREE.DirectionalLight>(null);
  const registryRef: Registry = useRef({});
  const explode = useRef({ t: 0 });
  const introK = useRef({ k: 0 });
  const slowMaterial = useRef(false);
  const frames = useRef({ sum: 0, n: 0 });

  const initial = product.finishes.find((f) => f.id === state.finishId) ?? product.finishes[0];
  const finishMat = useMemo(() => new THREE.MeshStandardMaterial({ color: initial.color, roughness: initial.roughness, metalness: initial.metalness, side: THREE.DoubleSide }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => finishMat.dispose(), [finishMat]);

  // 절차적 모델이면 마운트 즉시 준비 완료. GLB는 로드 후 onLoaded 에서 호출.
  const glbUrl = MODEL_ASSET.url;
  const { ready } = actions;
  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);

  // 뷰포트 비율에 맞춰 모델 스케일 (좁은 화면에서 잘림 방지)
  useEffect(() => {
    const s = THREE.MathUtils.clamp((size.width / size.height) * 1.1, 0.6, 1.05);
    yaw.current?.scale.setScalar(s);
  }, [size.width, size.height]);

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전
  useEffect(() => {
    const el = controls.current?.domElement as HTMLElement | undefined;
    if (el) el.style.touchAction = "pan-y";
  });

  // 인터랙션 5: 카메라·광원·모델 회전 GSAP 인트로
  const introActive = state.phase === "intro";
  const { introDone } = actions;
  useEffect(() => {
    if (!introActive) return;
    const g = yaw.current;
    if (!g) return;
    const ctx = gsap.context(() => {
      if (reduced) {
        camera.position.set(...CAMERA.home);
        g.rotation.y = 0;
        introK.current.k = 1;
        introDone();
        return;
      }
      camera.position.set(...CAMERA.intro);
      g.rotation.y = -Math.PI * 1.1;
      introK.current.k = 0;
      gsap
        .timeline({ onComplete: introDone, defaults: { ease: "power3.out" } })
        .to(camera.position, { x: CAMERA.home[0], y: CAMERA.home[1], z: CAMERA.home[2], duration: CAMERA.introDuration }, 0)
        .to(g.rotation, { y: 0, duration: CAMERA.introDuration }, 0)
        .to(introK.current, { k: 1, duration: CAMERA.introDuration * 0.7, ease: "power2.inOut" }, 0.15);
    });
    return () => ctx.kill();
  }, [introActive, reduced, camera, introDone]);

  // 인터랙션 3: 색상 전환 (전환 완료 시 상태 해제)
  const { transitionDone } = actions;
  useEffect(() => {
    const f = product.finishes.find((x) => x.id === state.finishId);
    if (!f) return;
    const target = new THREE.Color(f.color);
    if (finishMat.color.equals(target)) {
      transitionDone();
      return;
    }
    slowMaterial.current = true;
    if (reduced) {
      finishMat.color.copy(target);
      transitionDone();
      return;
    }
    const tw = gsap.to(finishMat.color, { r: target.r, g: target.g, b: target.b, duration: 0.7, ease: "power2.inOut", onComplete: transitionDone });
    return () => {
      tw.kill();
    };
  }, [state.finishId, product.finishes, finishMat, reduced, transitionDone]);

  // roughness·metalness (프리셋 전환 시 부드럽게, 슬라이더 조작 시 즉시에 가깝게)
  useEffect(() => {
    const dur = reduced ? 0 : slowMaterial.current ? 0.7 : 0.1;
    slowMaterial.current = false;
    const tw = gsap.to(finishMat, { roughness: state.roughness, metalness: state.metalness, duration: dur, overwrite: "auto" });
    return () => {
      tw.kill();
    };
  }, [state.roughness, state.metalness, finishMat, reduced]);

  // 부품 단위 exploded view (복귀 시 t=0 으로 정확히 원위치)
  const exploded = state.exploded;
  useEffect(() => {
    const to = exploded ? 1 : 0;
    if (explode.current.t === to) {
      transitionDone();
      return;
    }
    if (reduced) {
      explode.current.t = to;
      transitionDone();
      return;
    }
    const tw = gsap.to(explode.current, { t: to, duration: 1.1, ease: "power3.inOut", onComplete: transitionDone });
    return () => {
      tw.kill();
    };
  }, [exploded, reduced, transitionDone]);

  // 선택 부품 강조
  const selected = state.selected;
  useEffect(() => {
    const entries = registryRef.current;
    const tweens = (Object.keys(entries) as PartId[]).map((id) => {
      const e = entries[id]!;
      const s = e.scale * (selected === id ? 1.06 : 1);
      return gsap.to(e.obj.scale, { x: s, y: s, z: s, duration: reduced ? 0 : 0.25 });
    });
    return () => tweens.forEach((t) => t.kill());
  }, [selected, reduced]);

  // 키보드/버튼용 회전·시점 초기화
  const nudgeN = state.nudge.n;
  const nudgeDir = state.nudge.dir;
  useEffect(() => {
    if (nudgeN === 0 || !yaw.current) return;
    const tw = gsap.to(yaw.current.rotation, { y: `+=${nudgeDir * (Math.PI / 6)}`, duration: reduced ? 0 : 0.45, ease: "power2.out" });
    return () => {
      tw.kill();
    };
  }, [nudgeN, nudgeDir, reduced]);

  const resetN = state.resetN;
  useEffect(() => {
    if (resetN === 0 || !yaw.current) return;
    const dur = reduced ? 0 : 0.9;
    const ctx = gsap.context(() => {
      gsap.to(camera.position, { x: CAMERA.home[0], y: CAMERA.home[1], z: CAMERA.home[2], duration: dur, ease: "power3.inOut" });
      gsap.to(yaw.current!.rotation, { y: 0, duration: dur, ease: "power3.inOut" });
    });
    return () => ctx.kill();
  }, [resetN, reduced, camera]);

  useFrame((_, delta) => {
    // 부품 변환
    const t = explode.current.t;
    for (const p of product.parts) {
      const e = registryRef.current[p.id];
      if (e) e.obj.position.set(e.base.x + p.explode[0] * t, e.base.y + p.explode[1] * t, e.base.z + p.explode[2] * t);
    }
    if (controls.current) controls.current.target.y = 0.9 * t;
    // 광원 (hero-intensity × 인트로 페이드)
    const k = state.intensity * introK.current.k;
    if (keyLight.current) keyLight.current.intensity = 2.4 * k;
    if (rimLight.current) rimLight.current.intensity = 1.6 * k;
    // 프레임 시간 모니터 → 자동 품질 하향
    if (state.phase === "idle" || state.phase === "interacting" || state.phase === "transitioning") {
      if (delta < 0.25) {
        frames.current.sum += delta * 1000;
        frames.current.n++;
        if (frames.current.n >= 60) {
          const avg = frames.current.sum / frames.current.n;
          fpsRef.current = 1000 / avg;
          if (state.qualityMode === "auto") {
            const next = downgradeTier(tier, avg, 22);
            if (next !== tier) actions.downgrade(next);
          }
          frames.current = { sum: 0, n: 0 };
        }
      }
    }
  });

  const controlsEnabled = state.phase !== "loading" && state.phase !== "intro";
  const autoRotate = !reduced && (state.phase === "idle") && state.selected === null && !state.exploded;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight ref={keyLight} position={[4, 6, 3]} intensity={0} castShadow={quality.shadows} shadow-mapSize={[1024, 1024]} />
      <directionalLight ref={rimLight} position={[-4, 2, -4]} color={product.accent} intensity={0} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={0.7 * state.intensity}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
          <Lightformer form="ring" intensity={2} color={product.accent} position={[4, 0, -3]} scale={4} />
        </Environment>
      )}
      <group ref={yaw}>
        <Boundary
          onError={ready}
          fallback={<ProceduralModel product={product} mat={finishMat} registryRef={registryRef} segments={quality.segments} />}
        >
          <Suspense fallback={null}>
            {glbUrl ? (
              <GlbModel url={glbUrl} product={product} mat={finishMat} registryRef={registryRef} onLoaded={ready} />
            ) : (
              <ProceduralModel product={product} mat={finishMat} registryRef={registryRef} segments={quality.segments} />
            )}
          </Suspense>
        </Boundary>
        {product.parts.map((p) => (
          <Hotspot key={p.id} part={p} registryRef={registryRef} yaw={yaw} active={state.selected === p.id} visible={state.phase !== "loading" && state.phase !== "intro"} onSelect={actions.select} />
        ))}
        {quality.shadows && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.12, 0]} receiveShadow>
            <circleGeometry args={[4, 48]} />
            <shadowMaterial opacity={0.35} />
          </mesh>
        )}
      </group>
      {/* 인터랙션 2: 범위 제한 OrbitControls (이동 금지, 극각·거리 제한) */}
      <OrbitControls
        ref={controls}
        makeDefault
        enabled={controlsEnabled}
        enablePan={false}
        enableDamping
        minDistance={CAMERA.minDistance}
        maxDistance={CAMERA.maxDistance}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.52}
        autoRotate={autoRotate}
        autoRotateSpeed={CAMERA.autoRotateSpeed * state.speed}
        onStart={() => actions.interact(true)}
        onEnd={() => actions.interact(false)}
      />
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  return (
    <Boundary onError={props.actions.fail}>
      <Canvas
        shadows={preset.shadows}
        dpr={clampDpr(preset.dpr)}
        camera={{ position: CAMERA.intro, fov: CAMERA.fov, near: 0.1, far: 60 }}
        gl={{ antialias: props.tier !== "low", alpha: true, powerPreference: "high-performance" }}
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
