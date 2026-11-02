"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { CHAPTERS, LAST, type HeroSettings, type HeroStatus } from "./config";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Options = {
  rootRef: RefObject<HTMLElement | null>;
  trackRef: RefObject<HTMLElement | null>;
  settings: HeroSettings;
  /** false면 ScrollTrigger를 만들지 않는다(reduced-motion·fallback). */
  enabled: boolean;
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * scroll progress(0~1)가 단일 진실 공급원. progressRef를 Scene·텍스트 timeline이 함께 읽는다.
 * 스크롤 컨테이너: AppShell의 main은 overflow가 없어 window가 스크롤러 → ScrollTrigger 기본 scroller 사용.
 */
export function useHeroInteraction({ rootRef, trackRef, settings, enabled }: Options) {
  const progressRef = useRef(0);
  const introRef = useRef(0); // 0→1 인트로 dolly
  const stRef = useRef<ScrollTrigger | null>(null);
  const statusRef = useRef<HeroStatus>("loading");
  const timers = useRef<number[]>([]);
  const [status, setStatusState] = useState<HeroStatus>("loading");
  const [chapter, setChapter] = useState(0);
  const [ready, setReady] = useState(false);

  const setStatus = useCallback((s: HeroStatus) => {
    if (statusRef.current === s || statusRef.current === "fallback") return;
    statusRef.current = s;
    setStatusState(s);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  // 인트로: 로딩 완료 후 카메라 dolly-in. 이후 idle.
  useEffect(() => {
    if (!enabled || !ready) return;
    const timers_ = timers.current;
    setStatus("intro");
    const tween = gsap.to(introRef, {
      current: 1,
      duration: 1.2 / settings.speed,
      ease: "power2.out",
      onComplete: () => {
        if (statusRef.current === "intro") setStatus("idle");
      },
    });
    return () => {
      tween.kill();
      timers_.forEach(window.clearTimeout);
    };
    // 인트로는 ready 시 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ready]);

  // 인터랙션 2·5: pin(sticky)된 stage + scrub timeline. 3D progress와 텍스트가 같은 timeline.
  useGSAP(
    () => {
      const track = trackRef.current;
      const root = rootRef.current;
      if (!enabled || !track || !root) return;
      const layers = gsap.utils.toArray<HTMLElement>("[data-layer]", root);
      const cta = root.querySelector<HTMLElement>("[data-cta]");
      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const topOffset = () => (stage ? parseFloat(getComputedStyle(stage).top) || 0 : 0);

      const tl = gsap.timeline({ defaults: { ease: "none" } });
      tl.to(progressRef, { current: 1, duration: 1 }, 0);
      layers.forEach((el, i) => {
        const c = i / LAST;
        if (i > 0) tl.fromTo(el, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.07 }, c - 0.1);
        else gsap.set(el, { opacity: 1, y: 0 });
        if (i < LAST) tl.to(el, { opacity: 0, y: -28, duration: 0.07 }, c + 0.03);
      });
      if (cta) tl.to(cta, { autoAlpha: 0, duration: 0.05 }, 0.04);

      let idleId = 0;
      const st = ScrollTrigger.create({
        trigger: track,
        start: () => `top top+=${topOffset()}`,
        end: "bottom bottom",
        animation: tl,
        scrub: 0.6 / settings.speed,
        invalidateOnRefresh: true,
        snap: settings.snap
          ? { snapTo: 1 / LAST, duration: { min: 0.2, max: 0.6 }, delay: 0.12, ease: "power1.inOut" }
          : undefined,
        onUpdate: (self) => {
          setChapter(Math.round(self.progress * LAST));
          if (statusRef.current === "loading" || statusRef.current === "intro" || statusRef.current === "transitioning") return;
          setStatus("interacting");
          window.clearTimeout(idleId);
          idleId = later(() => setStatus("idle"), 200);
        },
      });
      stRef.current = st;
      return () => {
        window.clearTimeout(idleId);
        stRef.current = null;
      };
    },
    { scope: rootRef, dependencies: [enabled, settings.speed, settings.snap], revertOnUpdate: true },
  );

  // 캔버스 준비 후 레이아웃이 바뀌므로 한 번 refresh
  useEffect(() => {
    if (ready && enabled) ScrollTrigger.refresh();
  }, [ready, enabled]);

  // 인터랙션 6: dot navigation / CTA / 키보드
  const goTo = useCallback(
    (index: number) => {
      const st = stRef.current;
      const i = Math.min(LAST, Math.max(0, index));
      if (!st) {
        document.getElementById(`chapter-${CHAPTERS[i].id}`)?.scrollIntoView({ block: "start" });
        return;
      }
      const y = st.start + (i / LAST) * (st.end - st.start);
      setStatus("transitioning");
      window.scrollTo({ top: y, behavior: "smooth" });
      const clear = () => {
        if (statusRef.current === "transitioning") setStatus("idle");
      };
      later(clear, 1200);
    },
    [later, setStatus],
  );

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") goTo(Math.round(progressRef.current * LAST) + 1);
      else if (e.key === "ArrowLeft") goTo(Math.round(progressRef.current * LAST) - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, goTo]);

  // 탭 비활성/복귀 시 ticker 정리 상태 확인용 refresh
  useEffect(() => {
    if (!enabled) return;
    const onVis = () => {
      if (!document.hidden) ScrollTrigger.refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled]);

  const markFallback = useCallback(() => {
    statusRef.current = "fallback";
    setStatusState("fallback");
  }, []);

  const markReady = useCallback(() => setReady(true), []);

  return { progressRef, introRef, status, chapter, goTo, markReady, markFallback };
}
