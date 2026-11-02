"use client";

import { Component, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { clampDpr, downgradeTier, type QualityTier } from "@/lib/hero/performance";
import { ACCENT, CAMERA_SHOTS, INTRO_CAMERA, ITEMS, MODEL_ASSET, QUALITY_PRESETS, SLOTS, itemById, swatchOf } from "./config";
import type { GarmentShape, Look, SlotId } from "./types";
import type { LookbookActions, LookbookState } from "./useLookbook";
import styles from "./FashionAvatarLookbook.module.css";

export interface SceneProps {
  state: LookbookState;
  actions: LookbookActions;
  reduced: boolean;
  tier: QualityTier;
}

type FabricMats = Record<SlotId, THREE.MeshStandardMaterial>;
interface Motion {
  on: boolean;
}
type MotionRef = MutableRefObject<Motion>;

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

// ───────── 천 움직임 근사: 팔·밑단 리깅 흔들림 (실제 천 시뮬레이션이 아니다) ─────────
const ARM_REST = 0.1;
const armAngle = (t: number, side: number, on: boolean) => side * (ARM_REST + (on ? 0.035 * Math.sin(t * 1.3 + (side > 0 ? 0 : 1.7)) : 0));
const hemAngle = (t: number, on: boolean) => (on ? 0.035 * Math.sin(t * 1.1) : 0);

/** 팔 피벗(어깨). 아바타 팔과 소매가 같은 공식으로 움직인다. */
function ArmPivot({ side, motion, children }: { side: 1 | -1; motion: MotionRef; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = armAngle(clock.elapsedTime, side, motion.current.on);
  });
  return (
    <group ref={ref} position={[side * 0.255, 1.44, 0]} rotation={[0, 0, side * ARM_REST]}>
      {children}
    </group>
  );
}

/** 밑단 피벗(허리 높이). 코트·스커트 밑단이 가볍게 흔들린다. */
function HemPivot({ motion, children, y = 0.95 }: { motion: MotionRef; children: ReactNode; y?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = hemAngle(clock.elapsedTime, motion.current.on);
  });
  return (
    <group ref={ref} position={[0, y, 0]}>
      {children}
    </group>
  );
}

// ───────── 절차적 아바타 (체형 중립, 얼굴 없음) ─────────
function Avatar({ mat, seg, motion }: { mat: THREE.Material; seg: number; motion: MotionRef }) {
  const m = <primitive object={mat} attach="material" dispose={null} />;
  return (
    <group name={MODEL_ASSET.avatarNode}>
      <mesh position={[0, 1.74, 0]}>
        <sphereGeometry args={[0.105, seg, Math.max(8, seg / 2)]} />
        {m}
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.1, seg]} />
        {m}
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[1, 1, 0.62]}>
        <cylinderGeometry args={[0.2, 0.165, 0.56, seg]} />
        {m}
      </mesh>
      <mesh position={[0, 0.93, 0]} scale={[1, 1, 0.65]}>
        <cylinderGeometry args={[0.17, 0.17, 0.2, seg]} />
        {m}
      </mesh>
      {([1, -1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * 0.1, 0.48, 0]}>
            <cylinderGeometry args={[0.085, 0.052, 0.9, seg]} />
            {m}
          </mesh>
          <mesh position={[side * 0.1, 0.025, 0.04]}>
            <boxGeometry args={[0.08, 0.05, 0.17]} />
            {m}
          </mesh>
          <ArmPivot side={side} motion={motion}>
            <mesh position={[0, -0.29, 0]}>
              <cylinderGeometry args={[0.05, 0.038, 0.58, seg]} />
              {m}
            </mesh>
            <mesh position={[0, -0.61, 0]}>
              <sphereGeometry args={[0.04, 12, 8]} />
              {m}
            </mesh>
          </ArmPivot>
        </group>
      ))}
    </group>
  );
}

// ───────── 절차적 의류 ─────────
const SLEEVES: Partial<Record<GarmentShape, { len: number; rTop: number; rBot: number }>> = {
  tee: { len: 0.2, rTop: 0.064, rBot: 0.07 },
  shirt: { len: 0.52, rTop: 0.058, rBot: 0.05 },
  knit: { len: 0.54, rTop: 0.068, rBot: 0.06 },
  blazer: { len: 0.56, rTop: 0.07, rBot: 0.06 },
  coat: { len: 0.58, rTop: 0.076, rBot: 0.066 },
};
const BODY: Partial<Record<GarmentShape, { rTop: number; rBot: number; h: number; y: number }>> = {
  tee: { rTop: 0.215, rBot: 0.19, h: 0.56, y: 1.2 },
  shirt: { rTop: 0.217, rBot: 0.2, h: 0.62, y: 1.17 },
  knit: { rTop: 0.222, rBot: 0.215, h: 0.6, y: 1.18 },
  blazer: { rTop: 0.235, rBot: 0.225, h: 0.66, y: 1.15 },
  coat: { rTop: 0.24, rBot: 0.255, h: 0.5, y: 1.23 },
};

function Garment({ shape, name, mat, seg, motion }: { shape: GarmentShape; name: string; mat: THREE.Material; seg: number; motion: MotionRef }) {
  const m = <primitive object={mat} attach="material" dispose={null} />;
  const body = BODY[shape];
  const sleeve = SLEEVES[shape];
  return (
    <group name={name}>
      {body && (
        <mesh position={[0, body.y, 0]} scale={[1, 1, 0.64]}>
          <cylinderGeometry args={[body.rTop, body.rBot, body.h, seg]} />
          {m}
        </mesh>
      )}
      {shape === "knit" && (
        <mesh position={[0, 0.89, 0]} scale={[1, 1, 0.64]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.215, 0.022, 8, seg]} />
          {m}
        </mesh>
      )}
      {shape === "blazer" &&
        ([1, -1] as const).map((s) => (
          <mesh key={s} position={[s * 0.05, 1.3, 0.158]} rotation={[0, 0, s * 0.35]}>
            <boxGeometry args={[0.05, 0.3, 0.014]} />
            {m}
          </mesh>
        ))}
      {shape === "coat" && (
        <HemPivot motion={motion} y={0.98}>
          <mesh position={[0, -0.25, 0]} scale={[1, 1, 0.68]}>
            <cylinderGeometry args={[0.255, 0.33, 0.5, seg, 1, true]} />
            {m}
          </mesh>
        </HemPivot>
      )}
      {sleeve &&
        ([1, -1] as const).map((s) => (
          <ArmPivot key={s} side={s} motion={motion}>
            <mesh position={[0, -sleeve.len / 2 + 0.03, 0]}>
              <cylinderGeometry args={[sleeve.rTop, sleeve.rBot, sleeve.len, seg]} />
              {m}
            </mesh>
          </ArmPivot>
        ))}
      {(shape === "jeans" || shape === "chino") && (
        <>
          <mesh position={[0, 0.95, 0]} scale={[1, 1, 0.66]}>
            <cylinderGeometry args={[0.185, 0.18, 0.12, seg]} />
            {m}
          </mesh>
          {([1, -1] as const).map((s) => (
            <mesh key={s} position={[s * 0.1, 0.5, 0]}>
              <cylinderGeometry args={[shape === "jeans" ? 0.104 : 0.1, shape === "jeans" ? 0.076 : 0.066, 0.86, seg]} />
              {m}
            </mesh>
          ))}
        </>
      )}
      {shape === "skirt" && (
        <>
          <mesh position={[0, 0.96, 0]} scale={[1, 1, 0.66]}>
            <cylinderGeometry args={[0.18, 0.18, 0.1, seg]} />
            {m}
          </mesh>
          <HemPivot motion={motion} y={0.92}>
            <mesh position={[0, -0.3, 0]} scale={[1, 1, 0.8]}>
              <cylinderGeometry args={[0.185, 0.32, 0.6, 24, 1, true]} />
              {m}
            </mesh>
          </HemPivot>
        </>
      )}
    </group>
  );
}

// ───────── 원단 재질: 슬롯별 1개를 유지하고 색만 트윈한다 ─────────
/** 재질 변경은 렌더 밖(모듈 함수)에서 수행한다. 반환값은 정리 함수. */
function runFabric(mat: THREE.MeshStandardMaterial, itemId: string, swatchId: string, changed: boolean, animate: boolean, startAnim: () => () => void): () => void {
  const sw = swatchOf(itemById(itemId), swatchId);
  const target = new THREE.Color(sw.color);
  let tween: gsap.core.Tween | null = null;
  let end: (() => void) | null = null;
  if (changed) {
    // 새 의상: 색은 즉시, 불투명도로 입혀지는 연출
    mat.color.copy(target);
    mat.roughness = sw.roughness;
    if (animate) {
      const done = startAnim();
      end = done;
      mat.transparent = true;
      mat.opacity = 0;
      tween = gsap.to(mat, {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          mat.transparent = false;
          done();
        },
      });
    }
  } else if (!mat.color.equals(target)) {
    mat.roughness = sw.roughness;
    if (animate) {
      const done = startAnim();
      end = done;
      tween = gsap.to(mat.color, { r: target.r, g: target.g, b: target.b, duration: 0.5, ease: "power2.inOut", onComplete: done });
    } else {
      mat.color.copy(target);
    }
  }
  return () => {
    tween?.kill();
    mat.transparent = false;
    mat.opacity = 1;
    end?.();
  };
}

/** 슬롯 하나의 의상 교체(불투명도 등장)·색상 전환(트윈)을 처리한다. */
function useFabric(mat: THREE.MeshStandardMaterial, itemId: string | null, swatchId: string, reduced: boolean, animateOk: MutableRefObject<boolean>, startAnim: () => () => void) {
  const prevItem = useRef<string | null>(itemId);
  useLayoutEffect(() => {
    const changed = prevItem.current !== itemId;
    prevItem.current = itemId;
    if (!itemId) return;
    return runFabric(mat, itemId, swatchId, changed, !reduced && animateOk.current, startAnim);
  }, [mat, itemId, swatchId, reduced, animateOk, startAnim]);
}

function useFabrics(look: Look, reduced: boolean, animateOk: MutableRefObject<boolean>, startAnim: () => () => void): FabricMats {
  const mats = useMemo<FabricMats>(() => {
    const make = (slot: SlotId) => {
      const itemId = look[slot] ?? ITEMS.find((i) => i.slot === slot)!.id;
      const sw = swatchOf(itemById(itemId), look.swatch[slot]);
      return new THREE.MeshStandardMaterial({ color: sw.color, roughness: sw.roughness, metalness: 0, side: THREE.DoubleSide });
    };
    return { top: make("top"), bottom: make("bottom"), outer: make("outer") };
    // 최초 1회만 생성한다(이후 변경은 useFabric 이 트윈)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(
    () => () => {
      for (const s of SLOTS) mats[s].dispose();
    },
    [mats],
  );
  useFabric(mats.top, look.top, look.swatch.top, reduced, animateOk, startAnim);
  useFabric(mats.bottom, look.bottom, look.swatch.bottom, reduced, animateOk, startAnim);
  useFabric(mats.outer, look.outer, look.swatch.outer, reduced, animateOk, startAnim);
  return mats;
}

/** 자산 체크리스트: GLB 안에 계약된 노드가 모두 있는지 확인하고 누락 이름을 반환한다. */
export function missingNodes(root: THREE.Object3D): string[] {
  return [MODEL_ASSET.avatarNode, ...ITEMS.map((i) => i.node)].filter((n) => !root.getObjectByName(n));
}

function GlbLook({ url, look, mats, onLoaded }: { url: string; look: Look; mats: FabricMats; onLoaded: () => void }) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => {
    const missing = missingNodes(root);
    if (missing.length) console.warn("[FashionAvatarLookbook] GLB 노드 누락:", missing.join(", "));
    onLoaded();
  }, [root, onLoaded]);
  useEffect(() => {
    for (const item of ITEMS) {
      const o = root.getObjectByName(item.node);
      if (!o) continue;
      o.visible = look[item.slot] === item.id;
      if (o.visible) o.traverse((c) => ((c as THREE.Mesh).isMesh ? ((c as THREE.Mesh).material = mats[item.slot]) : undefined));
    }
  }, [root, look, mats]);
  return <primitive object={root} />;
}

/** 캔버스 드래그 회전. touch-action: pan-y 로 세로 스크롤은 막지 않는다. 반환값은 정리 함수. */
function bindDrag(el: HTMLCanvasElement, yaw: MutableRefObject<THREE.Group | null>, dragging: MutableRefObject<boolean>, onStart: (on: boolean) => void): () => void {
  el.style.touchAction = "pan-y";
  el.style.cursor = "grab";
  let lastX = 0;
  const down = (e: PointerEvent) => {
    dragging.current = true;
    lastX = e.clientX;
    el.setPointerCapture?.(e.pointerId);
    if (yaw.current) gsap.killTweensOf(yaw.current.rotation);
    onStart(false);
  };
  const move = (e: PointerEvent) => {
    if (!dragging.current || !yaw.current) return;
    yaw.current.rotation.y += (e.clientX - lastX) * 0.01;
    lastX = e.clientX;
  };
  const up = () => {
    dragging.current = false;
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
  };
}

// ───────── 장면 ─────────
function SceneContent({ state, actions, reduced, tier }: SceneProps) {
  const quality = QUALITY_PRESETS[tier];
  const { camera, gl } = useThree();
  const yaw = useRef<THREE.Group>(null);
  const lookTarget = useRef(new THREE.Vector3(0, 0.92, 0));
  const motion = useRef<Motion>({ on: state.clothMotion && !reduced });
  const frames = useRef({ sum: 0, n: 0 });
  const dragging = useRef(false);

  // 최신 상태를 읽는 ref (effect 안에서 갱신)
  const tokenRef = useRef(state.animToken);
  const animateOk = useRef(false);
  const shotRef = useRef(state.viewMode);
  const clothOn = state.clothMotion && !reduced;
  useLayoutEffect(() => {
    tokenRef.current = state.animToken;
    animateOk.current = state.phase === "idle";
    shotRef.current = state.viewMode;
    motion.current.on = clothOn;
  }, [state.animToken, state.phase, state.viewMode, clothOn]);

  // 진행 중 애니메이션 카운터: 0이 되면(마이크로태스크로 지연) isAnimating 해제
  const running = useRef(0);
  const { animDone } = actions;
  const startAnim = useCallback(() => {
    running.current++;
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      running.current--;
      queueMicrotask(() => {
        if (running.current === 0) animDone(tokenRef.current);
      });
    };
  }, [animDone]);

  const mats = useFabrics(state.look, reduced, animateOk, startAnim);
  const avatarMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c4bcb1", roughness: 0.8, metalness: 0 }), []);
  useEffect(() => () => avatarMat.dispose(), [avatarMat]);

  const glbUrl = MODEL_ASSET.url;
  const { ready, introDone, setTurntable } = actions;
  useEffect(() => {
    if (!glbUrl) ready();
  }, [glbUrl, ready]);

  // 터치: 세로 스와이프는 페이지 스크롤, 가로 드래그는 회전(Avatar Turntable)
  useEffect(() => bindDrag(gl.domElement, yaw, dragging, setTurntable), [gl, setTurntable]);

  // 인트로: 모델 등장. 벽시계 데드라인으로 반드시 끝낸다.
  const introActive = state.phase === "intro";
  useEffect(() => {
    if (!introActive) return;
    const g = yaw.current;
    if (!g) return;
    const shot = CAMERA_SHOTS.find((s) => s.id === shotRef.current) ?? CAMERA_SHOTS[0];
    const dur = 1.6;
    const deadline = window.setTimeout(introDone, reduced ? 0 : dur * 1000 + 600);
    const ctx = gsap.context(() => {
      if (reduced) {
        camera.position.set(...shot.position);
        lookTarget.current.set(...shot.target);
        g.rotation.y = 0;
        g.scale.setScalar(1);
        return;
      }
      camera.position.set(...INTRO_CAMERA);
      g.rotation.y = -Math.PI * 0.9;
      g.scale.setScalar(0.9);
      gsap
        .timeline({ onComplete: introDone, defaults: { ease: "power3.out" } })
        .to(camera.position, { x: shot.position[0], y: shot.position[1], z: shot.position[2], duration: dur }, 0)
        .to(lookTarget.current, { x: shot.target[0], y: shot.target[1], z: shot.target[2], duration: dur }, 0)
        .to(g.rotation, { y: 0, duration: dur }, 0)
        .to(g.scale, { x: 1, y: 1, z: 1, duration: dur }, 0);
    });
    return () => {
      window.clearTimeout(deadline);
      ctx.kill();
    };
  }, [introActive, reduced, camera, introDone]);

  // Editorial Camera Shots: GSAP 프리셋 전환 (인트로 중에는 인트로가 해당 프리셋으로 도착한다)
  const settled = state.phase === "idle" || state.phase === "fallback";
  const viewMode = state.viewMode;
  const resetN = state.resetN;
  useEffect(() => {
    if (!settled) return;
    const shot = CAMERA_SHOTS.find((s) => s.id === viewMode) ?? CAMERA_SHOTS[0];
    const end = startAnim();
    const dur = reduced ? 0 : 0.9;
    const tl = gsap
      .timeline({ defaults: { ease: "power3.inOut" }, onComplete: end })
      .to(camera.position, { x: shot.position[0], y: shot.position[1], z: shot.position[2], duration: dur }, 0)
      .to(lookTarget.current, { x: shot.target[0], y: shot.target[1], z: shot.target[2], duration: dur }, 0);
    return () => {
      tl.kill();
      end();
    };
  }, [viewMode, resetN, settled, reduced, camera, startAnim]);

  // 회전 명령(앞/뒤/좌/우) — 가장 가까운 각도로 돌린다
  const turn = state.turnCmd;
  useEffect(() => {
    const g = yaw.current;
    if (turn.n === 0 || !g) return;
    const cur = g.rotation.y;
    const TAU = Math.PI * 2;
    const to = turn.kind === "nudge" ? cur + turn.value : turn.value + Math.round((cur - turn.value) / TAU) * TAU;
    const tw = gsap.to(g.rotation, { y: to, duration: reduced ? 0 : 0.6, ease: "power2.out" });
    return () => {
      tw.kill();
    };
  }, [turn, reduced]);

  useFrame(({ clock }, delta) => {
    camera.lookAt(lookTarget.current);
    const g = yaw.current;
    if (g && state.phase === "idle" && state.turntable && !reduced && !dragging.current) g.rotation.y += delta * 0.5;
    // 숨쉬기 근사(가슴 폭): yaw 그룹의 첫 자식이 모델 루트
    if (g && state.phase === "idle" && clothOn) {
      const b = 1 + 0.006 * Math.sin(clock.elapsedTime * 1.6);
      g.children[0]?.scale.set(b, 1, b);
    }
    // 프레임 시간 모니터 → 자동 품질 하향
    if (state.phase === "idle" && delta < 0.25) {
      frames.current.sum += delta * 1000;
      frames.current.n++;
      if (frames.current.n >= 60) {
        const avg = frames.current.sum / frames.current.n;
        const next = downgradeTier(tier, avg, 22);
        if (next !== tier) actions.downgrade(next);
        frames.current = { sum: 0, n: 0 };
      }
    }
  });

  const seg = quality.segments;
  const procedural = (
    <>
      <Avatar mat={avatarMat} seg={seg} motion={motion} />
      {SLOTS.map((slot) => {
        const id = state.look[slot];
        if (!id) return null;
        const item = itemById(id);
        return <Garment key={item.id} shape={item.shape} name={item.node} mat={mats[slot]} seg={seg} motion={motion} />;
      })}
    </>
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#f4efe6", "#8c8478", 0.9]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} />
      <directionalLight position={[-4, 2, -3]} color={ACCENT} intensity={0.8} />
      {quality.environment && (
        <Environment resolution={128} frames={1} environmentIntensity={0.9}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, -1]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} />
        </Environment>
      )}
      <group ref={yaw}>
        <group>
          <Boundary onError={ready} fallback={procedural}>
            <Suspense fallback={null}>{glbUrl ? <GlbLook url={glbUrl} look={state.look} mats={mats} onLoaded={ready} /> : procedural}</Suspense>
          </Boundary>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[0.75, 48]} />
        <meshStandardMaterial color="#d6d1c8" roughness={1} />
      </mesh>
    </>
  );
}

export default function Scene(props: SceneProps) {
  const preset = QUALITY_PRESETS[props.tier];
  const wrap = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  // 화면 밖·탭 숨김이면 렌더 루프 중단
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const vis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div ref={wrap} className={styles.canvasWrap}>
      <Boundary onError={props.actions.fail}>
        <Canvas
          frameloop={inView && tabVisible ? "always" : "never"}
          dpr={clampDpr(preset.dpr)}
          camera={{ position: INTRO_CAMERA, fov: 30, near: 0.1, far: 60 }}
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
    </div>
  );
}
