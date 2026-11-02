"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import * as THREE from "three";
import { CAMERA_HOME, FOCUS_DISTANCE, GROUP_COLORS, type QualityPreset, type Settings } from "./config";
import type { ForceSim } from "./forceSim";
import type { GraphModel } from "./graphModel";
import type { HeroActions, InteractionState } from "./useHeroInteraction";

export type SceneStats = {
  fps: number;
  nodes: number;
  edges: number;
  visible: number;
  simRunning: boolean;
  drawCalls: number;
};

export type SceneProps = {
  model: GraphModel;
  sim: ForceSim;
  settings: Settings;
  preset: QualityPreset;
  dprMax: number;
  reducedMotion: boolean;
  /** false 이면 렌더 루프를 멈춘다 (일시정지·화면 밖) */
  active: boolean;
  state: InteractionState;
  actions: HeroActions;
  labelRefs: MutableRefObject<(HTMLSpanElement | null)[]>;
  onStats: (s: SceneStats) => void;
  onSlow: (avgMs: number) => void;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const LABEL_MAX_DIST = 21;

export default function Scene(props: SceneProps) {
  const { actions, preset, dprMax, active } = props;
  return (
    <Canvas
      dpr={[1, dprMax]}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: preset.antialias, powerPreference: "high-performance" }}
      camera={{ position: [...CAMERA_HOME.position], fov: CAMERA_HOME.fov, near: 0.1, far: 80 }}
      onCreated={() => actions.ready()}
      onPointerMissed={() => actions.clear()}
      style={{ touchAction: "none" }}
    >
      <Graph {...props} />
    </Canvas>
  );
}

function Graph({ model, sim, settings, preset, reducedMotion, state, actions, labelRefs, onStats, onSlow }: SceneProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dotsRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lineGeoRef = useRef<THREE.BufferGeometry>(null);
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const introT = useRef({ t: 0 });
  const focusTween = useRef<gsap.core.Tween | null>(null);
  const drag = useRef<{ i: number; x: number; y: number; moved: boolean; plane: THREE.Plane } | null>(null);

  const { n, m, hop, edgeA, edgeB } = model;

  const selIdx = state.selectedId ? (model.indexOf.get(state.selectedId) ?? -1) : -1;
  const hovIdx = state.hoveredId ? (model.indexOf.get(state.hoveredId) ?? -1) : -1;
  // 0: 무관, 1: 선택, 2: 1-hop 이웃
  const mask = useMemo(() => {
    const a = new Uint8Array(n);
    if (selIdx >= 0) {
      a[selIdx] = 1;
      for (const j of model.adj[selIdx]) a[j] = 2;
    }
    return a;
  }, [model, n, selIdx]);

  const geo = useMemo(() => {
    const baseColors = model.ids.map((id) => {
      const g = model.data.nodes.find((nd) => nd.id === id)?.group ?? "root";
      return new THREE.Color(GROUP_COLORS[g] ?? "#9aa7bd");
    });
    const labels = model.ids.map((id) => model.data.nodes.find((nd) => nd.id === id)?.label ?? "");
    const radius = new Float32Array(n);
    for (let i = 0; i < n; i++) radius[i] = i === 0 ? 0.34 : 0.1 + 0.035 * Math.sqrt(model.adj[i].length);
    const perEdge = m > 0 ? Math.max(1, Math.floor(preset.maxDots / m)) : 0;
    const dotCount = m * perEdge;
    return {
      baseColors,
      labels,
      radius,
      perEdge,
      dotCount,
      linePos: new Float32Array(m * 6),
      lineCol: new Float32Array(m * 6),
      vis: new Float32Array(n),
      sx: new Float32Array(n),
      sy: new Float32Array(n),
      sd: new Float32Array(n),
      onScreen: new Uint8Array(n),
    };
  }, [model, n, m, preset.maxDots]);

  // 렌더 루프가 읽는 최신 값 (렌더 중 ref 쓰기를 피하려고 effect에서 갱신)
  const live = useRef({ settings, state, mask, selIdx, hovIdx, reducedMotion });
  useEffect(() => {
    live.current = { settings, state, mask, selIdx, hovIdx, reducedMotion };
  });

  const accent = useMemo(() => new THREE.Color(settings.accent), [settings.accent]);
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      c: new THREE.Color(),
      v: new THREE.Vector3(),
      v2: new THREE.Vector3(),
      edgeBase: new THREE.Color("#5b6b8c"),
    }),
    [],
  );
  const stat = useRef({ frames: 0, acc: 0, slowN: 0, slowAcc: 0, warm: 0, time: 0, labelTick: 0 });

  // 레이캐스트 경계: 인스턴스가 움직이므로 고정 대형 구를 쓴다 (stale boundingSphere 방지)
  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 80);
  }, [n]);

  // 인터랙션 3: 중심 → 1-hop → 2-hop 지연 등장 (GSAP 타임라인)
  useEffect(() => {
    if (state.phase !== "intro") return;
    const t = introT.current;
    if (reducedMotion) {
      t.t = 1;
      actions.introDone();
      return;
    }
    t.t = 0;
    const tween = gsap.to(t, {
      t: 1,
      duration: 3.4 / settings.speed,
      ease: "power1.inOut",
      onComplete: () => actions.introDone(),
    });
    return () => {
      tween.kill();
    };
    // 속도 변경으로 인트로를 재시작하지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.introKey, reducedMotion, actions]);

  // 인터랙션 6: 카메라 포커싱 / 전체 보기
  useEffect(() => {
    if (state.focusSeq === 0) return;
    const ctl = controlsRef.current;
    if (!ctl) return;
    const L = live.current;
    const from = { p: camera.position.clone(), t: ctl.target.clone() };
    const toT = new THREE.Vector3();
    const toP = new THREE.Vector3();
    if (L.selIdx >= 0) {
      toT.set(sim.pos[L.selIdx * 3], sim.pos[L.selIdx * 3 + 1], sim.pos[L.selIdx * 3 + 2]);
      toP.copy(camera.position).sub(toT).normalize().multiplyScalar(FOCUS_DISTANCE).add(toT);
    } else {
      toP.set(...CAMERA_HOME.position);
    }
    focusTween.current?.kill();
    const proxy = { k: 0 };
    const apply = () => {
      camera.position.lerpVectors(from.p, toP, proxy.k);
      ctl.target.lerpVectors(from.t, toT, proxy.k);
      ctl.update();
    };
    if (L.reducedMotion) {
      proxy.k = 1;
      apply();
      actions.transitionEnd();
      return;
    }
    focusTween.current = gsap.to(proxy, {
      k: 1,
      duration: 1.1 / L.settings.speed,
      ease: "power3.inOut",
      onUpdate: apply,
      onComplete: () => actions.transitionEnd(),
    });
    return () => {
      focusTween.current?.kill();
    };
    // focusSeq 변경에만 반응
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.focusSeq]);

  // 인터랙션 1·7: 시뮬레이션 재가열
  useEffect(() => {
    if (state.reheatKey > 0) sim.reheat(0.9);
  }, [state.reheatKey, sim]);

  // hover 중에는 노드 드래그와 충돌하지 않도록 카메라 회전·팬 비활성화
  useEffect(() => {
    const ctl = controlsRef.current;
    if (ctl) {
      ctl.enableRotate = hovIdx < 0;
      ctl.enablePan = hovIdx < 0;
    }
    gl.domElement.style.cursor = hovIdx >= 0 ? "pointer" : "auto";
    return () => {
      gl.domElement.style.cursor = "auto";
    };
  }, [hovIdx, gl]);

  useEffect(() => {
    const dots = dotsRef.current;
    if (dots) dots.visible = settings.flow && geo.dotCount > 0;
  }, [settings.flow, geo.dotCount]);

  useFrame((frameState, dtRaw) => {
    const L = live.current;
    const dt = Math.min(dtRaw, 0.1);
    const S = stat.current;
    S.time += dt * L.settings.speed;
    const mesh = meshRef.current;
    const lineGeo = lineGeoRef.current;
    if (!mesh || !lineGeo) return;

    if (L.settings.simulate) sim.tick();
    const pos = sim.pos;
    const t = introT.current.t;
    const sel = L.selIdx;
    const filterOn = L.state.filter && sel >= 0;
    const snap = L.reducedMotion ? 1 : Math.min(1, dt * 8);
    const inten = L.settings.intensity;
    const { vis, radius, baseColors } = geo;
    const c = tmp.c;
    const prog = (i: number) => easeOut((t - (Math.min(hop[i], 3) * 0.2 + model.rank[i] * 0.15)) / 0.25);

    let visibleCount = 0;
    for (let i = 0; i < n; i++) {
      const p = prog(i);
      const target = filterOn ? (L.mask[i] ? 1 : 0) : 1;
      vis[i] += (target - vis[i]) * snap;
      const emphasis = i === sel ? 1.3 : i === L.hovIdx ? 1.25 : 1;
      const s = radius[i] * p * vis[i] * emphasis;
      if (s > 0.02) visibleCount++;
      tmp.m.makeScale(s, s, s).setPosition(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      mesh.setMatrixAt(i, tmp.m);
      c.copy(baseColors[i]);
      if (L.mask[i] === 1) c.lerp(accent, 0.7);
      else if (L.mask[i] === 2) c.lerp(accent, 0.2);
      const dim = sel >= 0 && !L.mask[i] ? 0.22 : 1;
      c.multiplyScalar(dim * inten * (i === L.hovIdx ? 1.4 : 1));
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // 간선: 자식 노드 등장에 맞춰 부모 → 자식 방향으로 순차 표시, 선택 간선 강조
    const lp = geo.linePos;
    const lc = geo.lineCol;
    for (let k = 0; k < m; k++) {
      const a = edgeA[k];
      const b = edgeB[k];
      const childIsB = hop[b] >= hop[a];
      const child = childIsB ? b : a;
      const ep = prog(child);
      const w = Math.min(vis[a], vis[b]);
      for (let q = 0; q < 3; q++) {
        const pa = pos[a * 3 + q];
        const pb = pos[b * 3 + q];
        lp[k * 6 + q] = childIsB ? pa : pb + (pa - pb) * ep;
        lp[k * 6 + 3 + q] = childIsB ? pa + (pb - pa) * ep : pb;
      }
      const hi = sel >= 0 && (a === sel || b === sel);
      const bright = (hi ? 1 : sel >= 0 ? 0.18 : 0.6) * inten * w * (ep > 0.01 ? 1 : 0);
      c.copy(hi ? accent : tmp.edgeBase).multiplyScalar(bright);
      for (let v = 0; v < 2; v++) {
        lc[k * 6 + v * 3] = c.r;
        lc[k * 6 + v * 3 + 1] = c.g;
        lc[k * 6 + v * 3 + 2] = c.b;
      }
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    // 인터랙션 7: 간선 flow dots (인스턴싱) — 선택 시 연결 간선에만 흐른다
    const dots = dotsRef.current;
    if (dots && dots.visible) {
      let d = 0;
      for (let k = 0; k < m; k++) {
        const a = edgeA[k];
        const b = edgeB[k];
        const childIsB = hop[b] >= hop[a];
        const from = childIsB ? a : b;
        const to = childIsB ? b : a;
        const ep = prog(to);
        const w = Math.min(vis[a], vis[b]);
        const hi = sel >= 0 && (a === sel || b === sel);
        const show = ep > 0.98 && w > 0.5 && (sel < 0 || hi);
        for (let j = 0; j < geo.perEdge; j++, d++) {
          const ph = (S.time * 0.18 + j / geo.perEdge + k * 0.137) % 1;
          const s = show ? (hi ? 0.075 : 0.05) : 0;
          for (let q = 0; q < 3; q++) {
            const pf = pos[from * 3 + q];
            tmp.v.setComponent(q, pf + (pos[to * 3 + q] - pf) * ph);
          }
          tmp.m.makeScale(s, s, s).setPosition(tmp.v);
          dots.setMatrixAt(d, tmp.m);
        }
      }
      dots.instanceMatrix.needsUpdate = true;
    }

    // 선택 링 (빌보드)
    const ring = ringRef.current;
    if (ring) {
      ring.visible = sel >= 0;
      if (sel >= 0) {
        ring.position.set(pos[sel * 3], pos[sel * 3 + 1], pos[sel * 3 + 2]);
        ring.quaternion.copy(camera.quaternion);
        const rs = radius[sel] * 2.1 * (1 + Math.sin(S.time * 3) * 0.04);
        ring.scale.set(rs, rs, rs);
      }
    }

    // 인터랙션 5: 3D 좌표 → HTML 라벨 (거리 제한·가림·겹침 회피)
    if (++S.labelTick % 2 === 0) updateLabels(frameState.size.width, frameState.size.height);

    // 성능 측정 → 자동 품질 하향
    if (dtRaw < 0.25) {
      S.frames++;
      S.acc += dtRaw;
      if (++S.warm > 150) {
        S.slowN++;
        S.slowAcc += dtRaw * 1000;
        if (S.slowN >= 90) {
          onSlow(S.slowAcc / S.slowN);
          S.slowN = 0;
          S.slowAcc = 0;
        }
      }
    }
    if (S.frames >= 30) {
      onStats({
        fps: Math.round(S.frames / S.acc),
        nodes: n,
        edges: m,
        visible: visibleCount,
        simRunning: L.settings.simulate && sim.running,
        drawCalls: frameState.gl.info.render.calls,
      });
      S.frames = 0;
      S.acc = 0;
    }

    function updateLabels(w: number, h: number) {
      const els = labelRefs.current;
      const { sx, sy, sd, onScreen } = geo;
      const camPos = camera.position;
      for (let i = 0; i < n; i++) {
        tmp.v2.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        sd[i] = tmp.v2.distanceTo(camPos);
        tmp.v2.project(camera);
        sx[i] = (tmp.v2.x * 0.5 + 0.5) * w;
        sy[i] = (-tmp.v2.y * 0.5 + 0.5) * h;
        onScreen[i] = tmp.v2.z < 1 && sx[i] > -20 && sx[i] < w + 20 && sy[i] > -20 && sy[i] < h + 20 ? 1 : 0;
      }
      const cand: { i: number; prio: number }[] = [];
      if (L.settings.labels) {
        for (let i = 0; i < n; i++) {
          if (!onScreen[i] || vis[i] < 0.5 || prog(i) < 0.9) continue;
          const prio = i === sel ? 0 : i === L.hovIdx ? 1 : L.mask[i] === 2 ? 2 : 3;
          if (prio === 3 && (sd[i] > LABEL_MAX_DIST || (sel >= 0 && filterOn))) continue;
          if (prio === 3 && hop[i] > 1 && sd[i] > 14 && sel < 0) continue;
          cand.push({ i, prio });
        }
        cand.sort((x, y) => x.prio - y.prio || sd[x.i] - sd[y.i]);
      }
      const placed: [number, number, number, number][] = [];
      const shown = new Set<number>();
      for (const { i, prio } of cand) {
        if (prio === 3 && shown.size >= preset.maxLabels) break;
        // 가림: 더 가까운 노드가 화면상 같은 위치면 숨김
        if (prio === 3) {
          let hidden = false;
          for (let j = 0; j < n; j++) {
            if (j !== i && onScreen[j] && vis[j] > 0.5 && sd[j] < sd[i] - 0.05 && Math.abs(sx[j] - sx[i]) < 9 && Math.abs(sy[j] - sy[i]) < 9) {
              hidden = true;
              break;
            }
          }
          if (hidden) continue;
        }
        const label = geo.labels[i];
        const rect: [number, number, number, number] = [sx[i] + 10, sy[i] - 11, label.length * 11 + 20, 22];
        if (prio >= 2 && placed.some((r) => rect[0] < r[0] + r[2] && rect[0] + rect[2] > r[0] && rect[1] < r[1] + r[3] && rect[1] + rect[3] > r[1])) continue;
        placed.push(rect);
        shown.add(i);
      }
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        if (!el) continue;
        if (shown.has(i)) {
          el.style.transform = `translate3d(${(sx[i] + 10).toFixed(1)}px, ${(sy[i] - 11).toFixed(1)}px, 0)`;
          el.style.opacity = String(Math.min(1, Math.max(0.35, (LABEL_MAX_DIST - sd[i]) / 4)));
          el.dataset.active = i === sel ? "selected" : i === L.hovIdx ? "hover" : L.mask[i] === 2 ? "near" : "";
        } else if (el.style.opacity !== "0") {
          el.style.opacity = "0";
        }
      }
    }
  });

  // --- 포인터: hover / select 분리, 노드 드래그 ---
  const idxOf = (e: ThreeEvent<PointerEvent>) => {
    const i = e.instanceId ?? -1;
    return i >= 0 && geo.vis[i] > 0.5 ? i : -1;
  };
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    sim.unpin(d.i);
    drag.current = null;
    const ctl = controlsRef.current;
    if (ctl) ctl.enabled = true;
    if (d.moved) actions.interactEnd();
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const i = idxOf(e);
    if (i < 0) return;
    e.stopPropagation();
    const ctl = controlsRef.current;
    if (ctl) ctl.enabled = false;
    const normal = camera.getWorldDirection(new THREE.Vector3());
    const point = new THREE.Vector3(sim.pos[i * 3], sim.pos[i * 3 + 1], sim.pos[i * 3 + 2]);
    drag.current = { i, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, moved: false, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point) };
    (e.target as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture(e.pointerId);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (d) {
      e.stopPropagation();
      if (!d.moved && Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > 5) {
        d.moved = true;
        actions.interactStart();
      }
      if (d.moved && e.ray.intersectPlane(d.plane, tmp.v)) {
        sim.pin(d.i, tmp.v.x, tmp.v.y, tmp.v.z);
        if (live.current.settings.simulate) sim.reheat(0.3);
      }
      return;
    }
    const i = idxOf(e);
    if (i >= 0) {
      e.stopPropagation();
      actions.hover(model.ids[i]);
    }
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d) return;
    e.stopPropagation();
    const wasClick = !d.moved;
    const id = model.ids[d.i];
    endDrag();
    if (wasClick) {
      if (live.current.state.selectedId === id) actions.clear();
      else actions.select(id);
    }
  };

  useEffect(
    () => () => {
      focusTween.current?.kill();
    },
    [],
  );

  const seg = preset.sphereSegments;
  return (
    <>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={22}
        autoRotate={settings.autoRotate && !reducedMotion && selIdx < 0 && state.phase !== "interacting" && hovIdx < 0}
        autoRotateSpeed={0.6 * settings.speed}
        onStart={() => {
          focusTween.current?.kill();
          actions.interactStart();
        }}
        onEnd={() => actions.interactEnd()}
      />
      <lineSegments frustumCulled={false} raycast={() => null}>
        <bufferGeometry ref={lineGeoRef}>
          <bufferAttribute attach="attributes-position" args={[geo.linePos, 3]} usage={THREE.DynamicDrawUsage} />
          <bufferAttribute attach="attributes-color" args={[geo.lineCol, 3]} usage={THREE.DynamicDrawUsage} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors toneMapped={false} />
      </lineSegments>
      <instancedMesh
        key={`nodes-${n}-${seg}`}
        ref={meshRef}
        args={[undefined, undefined, n]}
        frustumCulled={false}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onLostPointerCapture={endDrag}
        onPointerOut={() => {
          if (!drag.current) actions.hover(null);
        }}
      >
        <sphereGeometry args={[1, seg, seg]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {geo.dotCount > 0 && (
        <instancedMesh key={`dots-${geo.dotCount}`} ref={dotsRef} args={[undefined, undefined, geo.dotCount]} frustumCulled={false} raycast={() => null}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color={settings.accent} toneMapped={false} />
        </instancedMesh>
      )}
      <mesh ref={ringRef} visible={false} raycast={() => null}>
        <ringGeometry args={[0.88, 1, 48]} />
        <meshBasicMaterial color={settings.accent} side={THREE.DoubleSide} toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </>
  );
}
