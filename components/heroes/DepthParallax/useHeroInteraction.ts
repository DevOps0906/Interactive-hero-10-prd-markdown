"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CAMERA, type FocusObject } from "./config";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type HeroPhase = "loading" | "intro" | "idle" | "interacting" | "transitioning" | "fallback";

/** 입력·애니메이션 원본 값. ref처럼 변경되며 렌더 루프가 읽는다. */
export interface InteractionInput {
  tx: number; // 포인터 목표 (-1~1)
  ty: number;
  x: number; // 보간된 포인터
  y: number;
  scroll: number; // ScrollTrigger tween 값 0~1
  dolly: number; // 보간된 scroll
  intro: number; // 0~1
  focus: number; // 0~1 (gsap tween)
  fx: number; // 포커스 대상 위치
  fy: number;
  fz: number;
}

export interface CameraPose {
  px: number;
  py: number;
  pz: number;
  lx: number;
  ly: number;
  lz: number;
}

export interface ComposeParams {
  intensity: number;
  speed: number;
  /** 카메라 범위 배율 (모바일 축소) */
  range: number;
  reduced: boolean;
}

const clamp = (v: number, min = -1, max = 1) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 렌더 루프가 읽는 가변 입력 객체 갱신 (React state 불변 규칙 밖의 의도된 변경) */
function setInput(target: InteractionInput, patch: Partial<InteractionInput>) {
  Object.assign(target, patch);
}

function createInput(): InteractionInput {
  return { tx: 0, ty: 0, x: 0, y: 0, scroll: 0, dolly: 0, intro: 0, focus: 0, fx: 0, fy: 0, fz: 0 };
}

export function createPose(): CameraPose {
  return { px: 0, py: 0.4, pz: CAMERA.baseZ, lx: 0, ly: 0, lz: CAMERA.baseZ - 30 };
}

/** 포인터·스크롤·인트로·포커스를 하나의 카메라 상태로 합성한다 (PRD 8장). */
export function composeCamera(input: InteractionInput, p: ComposeParams, dt: number, out: CameraPose) {
  const k = p.reduced ? 1 : 1 - Math.exp(-dt * 5 * p.speed);
  input.x += (input.tx - input.x) * k;
  input.y += (input.ty - input.y) * k;
  input.dolly += (input.scroll - input.dolly) * k;

  const amp = p.intensity * p.range * (p.reduced ? 0.6 : 1);
  const dolly = CAMERA.dollyDistance * (p.reduced ? 0.5 : 1);
  const pz = CAMERA.baseZ - input.dolly * dolly + (1 - input.intro) * 8;
  const px = input.x * 1.8 * amp;
  const py = 0.4 + input.y * 1.0 * amp;
  const lx = px + input.x * 4 * amp; // 시선은 포인터 방향으로 살짝 회전
  const ly = py + input.y * 2.5 * amp;

  const f = input.focus;
  out.px = lerp(px, input.fx, f);
  out.py = lerp(py, input.fy + 0.2, f);
  out.pz = lerp(pz, input.fz + 6, f);
  out.lx = lerp(lx, input.fx, f);
  out.ly = lerp(ly, input.fy, f);
  out.lz = lerp(pz - 30, input.fz, f);
}

let webglCache: boolean | null = null;
/** WebGL 지원 여부 (한 번만 검사). */
export function supportsWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

interface Args {
  rootRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLElement | null>;
  reduced: boolean;
  speed: number;
  objects: FocusObject[];
}

export function useHeroInteraction({ rootRef, trackRef, reduced, speed, objects }: Args) {
  const [phase, setPhaseState] = useState<HeroPhase>("loading");
  const [input] = useState(createInput);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const phaseRef = useRef<HeroPhase>("loading");
  const reducedRef = useRef(reduced);
  const speedRef = useRef(speed);
  const renderRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const focusBusy = useRef(false);

  useEffect(() => {
    reducedRef.current = reduced;
    speedRef.current = speed;
  }, [reduced, speed]);

  const requestRender = useCallback(() => renderRef.current?.(), []);

  // 상태 충돌 방지: 허용된 전이만 통과
  const transition = useCallback((next: HeroPhase) => {
    const cur = phaseRef.current;
    if (cur === next || cur === "fallback") return;
    if (next !== "fallback") {
      if (cur === "loading" && next !== "intro") return;
      if (cur === "intro" && next !== "idle") return;
      if (cur === "transitioning" && next === "interacting") return;
    }
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const scheduleIdle = useCallback(
    (ms: number) => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (!focusBusy.current) transition("idle");
      }, ms);
    },
    [transition],
  );

  // 포인터 정규화 좌표
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (reducedRef.current) return;
      setInput(input, {
        tx: clamp((e.clientX / window.innerWidth) * 2 - 1),
        ty: -clamp((e.clientY / window.innerHeight) * 2 - 1),
      });
      if (phaseRef.current === "idle" || phaseRef.current === "interacting") {
        transition("interacting");
        scheduleIdle(1200);
      }
    };
    const onLeave = () => {
      setInput(input, { tx: 0, ty: 0 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [input, transition, scheduleIdle]);

  // 스크롤 → camera dolly (gsap tween + ScrollTrigger scrub)
  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track) return;
      gsap.to(input, {
        scroll: 1,
        ease: "none",
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: reduced ? true : 0.6,
          onUpdate: (self) => {
            setProgress(Math.round(self.progress * 100));
            if (phaseRef.current === "idle" || phaseRef.current === "interacting") {
              transition("transitioning");
              scheduleIdle(160);
            }
            renderRef.current?.();
          },
        },
      });
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  // 언마운트: 타이머·tween 정리
  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      gsap.killTweensOf(input);
    };
  }, [input]);

  /** Canvas 생성 완료 → 인트로 시작 */
  const markReady = useCallback(
    (invalidate?: () => void) => {
      renderRef.current = invalidate ?? null;
      if (phaseRef.current !== "loading") return;
      transition("intro");
      if (reducedRef.current) {
        setInput(input, { intro: 1 });
        transition("idle");
        invalidate?.();
        return;
      }
      gsap.to(input, {
        intro: 1,
        duration: 2.4 / Math.max(speedRef.current, 0.4),
        ease: "power3.out",
        onComplete: () => transition("idle"),
      });
    },
    [input, transition],
  );

  const markFallback = useCallback(() => {
    gsap.killTweensOf(input);
    transition("fallback");
  }, [input, transition]);

  const focusObject = useCallback(
    (id: string | null) => {
      gsap.killTweensOf(input, "focus");
      const obj = id ? objects.find((o) => o.id === id) : undefined;
      if (obj) {
        setInput(input, { fx: obj.position[0], fy: obj.position[1], fz: obj.position[2] });
      }
      setFocusedId(obj ? obj.id : null);
      const target = obj ? 1 : 0;
      if (reducedRef.current) {
        setInput(input, { focus: target });
        requestRender();
        return;
      }
      focusBusy.current = true;
      transition("transitioning");
      gsap.to(input, {
        focus: target,
        duration: 1.1 / Math.max(speedRef.current, 0.4),
        ease: "power3.inOut",
        onUpdate: requestRender,
        onComplete: () => {
          focusBusy.current = false;
          transition("idle");
        },
      });
    },
    [input, objects, transition, requestRender],
  );

  /** 키보드·버튼용 시점 이동 (포인터 대체) */
  const nudge = useCallback(
    (dx: number, dy: number) => {
      setInput(input, { tx: clamp(input.tx + dx), ty: clamp(input.ty + dy) });
      if (phaseRef.current === "idle" || phaseRef.current === "interacting") {
        transition("interacting");
        scheduleIdle(1200);
      }
      requestRender();
    },
    [input, transition, scheduleIdle, requestRender],
  );

  const resetView = useCallback(() => {
    setInput(input, { tx: 0, ty: 0 });
    requestRender();
  }, [input, requestRender]);

  const scrollToProgress = useCallback(
    (p: number) => {
      const track = trackRef.current;
      if (!track) return;
      const top = track.getBoundingClientRect().top + window.scrollY;
      const span = track.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + span * p, behavior: reducedRef.current ? "auto" : "smooth" });
    },
    [trackRef],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
      const step = 0.35;
      switch (e.key) {
        case "ArrowLeft":
          nudge(-step, 0);
          break;
        case "ArrowRight":
          nudge(step, 0);
          break;
        case "ArrowUp":
          nudge(0, step);
          break;
        case "ArrowDown":
          nudge(0, -step);
          break;
        case "Escape":
          if (focusedId) focusObject(null);
          return;
        default:
          return;
      }
      e.preventDefault();
    },
    [nudge, focusObject, focusedId],
  );

  return {
    phase,
    input,
    focusedId,
    progress,
    markReady,
    markFallback,
    focusObject,
    nudge,
    resetView,
    scrollToProgress,
    handleKeyDown,
  };
}
