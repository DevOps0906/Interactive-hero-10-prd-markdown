"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  detectQualityTier,
  downgradeTier,
  prefersReducedMotion,
  subscribeReducedMotion,
  type QualityTier,
} from "@/lib/hero/performance";
import {
  BASE_MARQUEE_PX_PER_SEC,
  MAX_SKEW_DEG,
  TIER_PRESETS,
  type HeroState,
  type KineticOptions,
} from "./config";

gsap.registerPlugin(ScrollTrigger);

export interface HeroRefs {
  root: RefObject<HTMLElement | null>;
  title: RefObject<HTMLElement | null>;
  next: RefObject<HTMLElement | null>;
}

export interface HeroInteraction {
  state: HeroState;
  tier: QualityTier;
  reduced: boolean;
  /** 마키 한 줄에 필요한 복제본 수 (측정 기반) */
  copies: number;
  replayReveal: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** 마키 루프·스크롤/포인터 속도·글자 reveal·pin scrub을 관리하고 unmount 때 모두 정리한다. */
export function useHeroInteraction(refs: HeroRefs, options: KineticOptions): HeroInteraction {
  const [state, setState] = useState<HeroState>("loading");
  const [tier, setTier] = useState<QualityTier>("high");
  const [reduced, setReduced] = useState(false);
  const [copies, setCopies] = useState(3);
  const optRef = useRef(options);
  const stateRef = useRef<HeroState>("loading");
  const replayRef = useRef<() => void>(() => {});
  const pinRef = useRef<() => void>(() => {});

  useEffect(() => {
    optRef.current = options;
  }, [options]);

  // pin 옵션 토글 → ScrollTrigger 재생성
  useEffect(() => {
    pinRef.current();
  }, [options.pin]);

  // reduced-motion 구독
  useEffect(() => {
    const init = window.setTimeout(() => setReduced(prefersReducedMotion()), 0);
    const off = subscribeReducedMotion(setReduced);
    return () => {
      window.clearTimeout(init);
      off();
    };
  }, []);

  useEffect(() => {
    const root = refs.root.current;
    const titleEl = refs.title.current;
    const nextEl = refs.next.current;
    if (!root || !titleEl) return;

    const update = (s: HeroState) => {
      if (stateRef.current === "error") return; // 오류 상태는 되돌리지 않음
      stateRef.current = s;
      setState(s);
    };

    if (reduced) {
      // 정적 대체: 애니메이션·핀 없음. 제목·마키 1벌이 그대로 보인다.
      const t = window.setTimeout(() => {
        setTier("low");
        update("idle");
      }, 0);
      return () => window.clearTimeout(t);
    }

    let disposed = false;
    let started = false;
    let tickFn: ((time: number, delta: number) => void) | undefined;
    let idleTimer: number | undefined;
    let st: ScrollTrigger | undefined;
    const cleanups: Array<() => void> = [];

    const start = () => {
      if (disposed || started) return;
      started = true;
      try {
        let curTier = detectQualityTier();
        setTier(curTier);
        const tracks = Array.from(root.querySelectorAll<HTMLElement>("[data-kt-row]")).map((row) => ({
          track: row.querySelector<HTMLElement>("[data-kt-track]")!,
          copy: row.querySelector<HTMLElement>("[data-kt-copy]")!,
          dir: Number(row.dataset.ktDir ?? 1),
          x: 0,
          w: 0,
        }));
        const letters = Array.from(titleEl.querySelectorAll<HTMLElement>("[data-kt-letter]"));

        // 1) 측정 기반 seamless marquee: 한 벌 너비를 재서 화면을 덮을 만큼만 복제한다.
        const measure = () => {
          let need = 2;
          for (const t of tracks) {
            t.w = t.copy.getBoundingClientRect().width;
            if (t.w > 0) need = Math.max(need, Math.ceil(root.clientWidth / t.w) + 1);
          }
          setCopies(need);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(root);
        tracks.forEach((t) => ro.observe(t.copy));
        cleanups.push(() => ro.disconnect());

        let scrollVel = 0;
        let smoothScroll = 0;
        let pointerVel = 0;
        let smoothPointer = 0;
        let lastPX = 0;
        let lastPT = 0;
        let dirSign = 1;

        const onPointer = (e: PointerEvent) => {
          const now = performance.now();
          if (lastPT) pointerVel = ((e.clientX - lastPX) / Math.max(1, now - lastPT)) * 1000;
          lastPX = e.clientX;
          lastPT = now;
          if (stateRef.current === "idle") update("interacting");
          window.clearTimeout(idleTimer);
          idleTimer = window.setTimeout(() => {
            if (stateRef.current === "interacting") update("idle");
          }, 600);
        };
        window.addEventListener("pointermove", onPointer, { passive: true });
        cleanups.push(() => window.removeEventListener("pointermove", onPointer));

        // 4) 글자별 rotation·y stagger reveal (intro / replay)
        replayRef.current = () => {
          if (stateRef.current === "transitioning") return; // 상태 충돌 방지
          update("intro");
          gsap.fromTo(
            letters,
            { yPercent: 120, rotate: () => gsap.utils.random(-25, 25), opacity: 0 },
            {
              yPercent: 0,
              rotate: 0,
              opacity: 1,
              duration: 0.9,
              ease: "power4.out",
              stagger: 0.05,
              overwrite: "auto",
              onComplete: () => {
                if (stateRef.current === "intro") update("idle");
              },
            },
          );
        };

        // 6) Pin/Scrub: 대형 글자 확대·다음 장면 전환
        const createST = () => {
          st?.kill();
          st = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: "+=100%",
            pin: optRef.current.pin,
            scrub: true,
            onUpdate: (self) => {
              scrollVel = self.getVelocity();
              if (Math.abs(scrollVel) > 5) dirSign = scrollVel > 0 ? 1 : -1;
              const p = self.progress;
              gsap.set(titleEl, { scale: 1 + p * 1.6 });
              if (nextEl) gsap.set(nextEl, { opacity: clamp((p - 0.5) * 2, 0, 1), yPercent: (1 - p) * 40 });
              const inTransition = p > 0.05 && p < 0.98;
              if (inTransition && stateRef.current !== "transitioning" && stateRef.current !== "intro") update("transitioning");
              else if (!inTransition && stateRef.current === "transitioning") update("idle");
            },
          });
        };
        createST();
        pinRef.current = createST;
        cleanups.push(() => {
          st?.kill();
          pinRef.current = () => {};
        });

        const skewTo = gsap.quickTo(titleEl, "skewX", { duration: 0.4, ease: "power3.out" });

        // ticker: marquee 이동 + skew + 프레임 모니터링. 탭 비활성 시 rAF가 멈추고 delta는 clamp.
        let frames = 0;
        let acc = 0;
        tickFn = (_t, deltaMs) => {
          const dt = Math.min(deltaMs, 100) / 1000;
          const o = optRef.current;
          const preset = TIER_PRESETS[curTier];
          root.style.setProperty("--kt-wght", String(o.weight));
          root.style.setProperty("--kt-wdth", String(o.width));
          root.style.setProperty("--hero-speed", String(o.speed));
          root.style.setProperty("--hero-intensity", String(o.intensity));

          // 2) 스크롤 속도 스무딩 → 마키 속도·방향
          smoothScroll += (clamp(scrollVel, -preset.maxVelocity, preset.maxVelocity) - smoothScroll) * Math.min(1, dt * 6);
          scrollVel *= 0.9;
          const speed = (BASE_MARQUEE_PX_PER_SEC * o.speed + Math.abs(smoothScroll) * 0.3 * o.intensity) * dirSign;

          for (const t of tracks) {
            if (t.w <= 0) continue;
            t.x = (((t.x + speed * t.dir * dt) % t.w) + t.w) % t.w;
            t.track.style.transform = `translate3d(${-t.x}px,0,0)`;
          }

          // 5) 포인터 속도 skew (clamp)
          pointerVel *= 0.9;
          smoothPointer += (pointerVel - smoothPointer) * Math.min(1, dt * 8);
          skewTo(
            o.skew && preset.skewEnabled
              ? clamp((smoothPointer / 1500) * MAX_SKEW_DEG * o.intensity, -MAX_SKEW_DEG, MAX_SKEW_DEG)
              : 0,
          );

          // 프레임 시간 평균이 예산을 넘으면 품질 하향
          frames++;
          acc += deltaMs;
          if (frames >= 90) {
            const next = downgradeTier(curTier, acc / frames, 24);
            if (next !== curTier) {
              curTier = next;
              setTier(next);
            }
            frames = 0;
            acc = 0;
          }
        };
        gsap.ticker.add(tickFn);
        replayRef.current();
      } catch {
        stateRef.current = "error";
        setState("error");
      }
    };

    // 로딩: 폰트 준비 후 시작 (최대 1.5s 대기)
    const timeout = window.setTimeout(start, 1500);
    document.fonts?.ready.then(() => {
      window.clearTimeout(timeout);
      start();
    });
    if (!document.fonts) start();

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearTimeout(idleTimer);
      if (tickFn) gsap.ticker.remove(tickFn);
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf([titleEl, nextEl].filter(Boolean));
      gsap.killTweensOf(titleEl.querySelectorAll("[data-kt-letter]"));
      replayRef.current = () => {};
      stateRef.current = "loading";
    };
    // refs는 안정적인 ref 객체
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return { state, tier, reduced, copies, replayReveal: () => replayRef.current() };
}
