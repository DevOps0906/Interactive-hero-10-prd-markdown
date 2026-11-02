"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Controls from "./Controls";
import Summary, { goTrial } from "./Summary";
import { LEVELS } from "./config";
import { track, useLab } from "./useLab";
import styles from "./RobotLearningLab.module.css";

// 3D 는 클라이언트 전용으로 지연 로딩한다(번들·SSR 보호)
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const hero = getIndustryHero("academy-robot-lab");

const subscribeFs = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

export default function RobotLearningLabHero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const lab = useLab(stageRef);
  const { state, actions, pose, ikInfo } = lab;
  const fsActive = useSyncExternalStore(subscribeFs, () => !!document.fullscreenElement, () => false);
  const fsSupported = useSyncExternalStore(subscribeFs, () => document.fullscreenEnabled, () => false);

  const toggleFs = useCallback(() => {
    const box = stageRef.current?.closest<HTMLElement>(".hero-stagebox");
    if (!box) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void box.requestFullscreen?.().catch(() => undefined);
  }, []);

  const fallback = state.phase === "fallback";
  const loading = state.phase === "loading";
  const levelLabel = LEVELS.find((l) => l.id === state.level)?.label;

  return (
    <div className={styles.root}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <a
              className={`btn-primary ${styles.ctaLink}`}
              href="#trial-form"
              onClick={(e) => {
                e.preventDefault();
                track("hero_cta_click", { where: "hero", level: state.level });
                goTrial(state.reduced);
              }}
            >
              체험 수업 신청
            </a>
            <p role="status">
              DEMO · 물리 로봇을 제어하지 않는 시뮬레이션 · 학습 레벨 {levelLabel}
              {state.running ? " · 동작 실행 중" : ""}
            </p>
          </>
        }
        overlay={
          <>
            {loading ? (
              <div className={styles.loading} role="status">
                <span className={styles.spinner} aria-hidden="true" />
                <span>3D 로봇 불러오는 중…</span>
              </div>
            ) : null}
            {fallback ? (
              <p className={styles.fallbackMsg} role="status">
                3D 화면을 표시할 수 없어 정지 이미지로 대체했어요. 아래 조작실의 텍스트 값과 신청 폼은 그대로 쓸 수 있어요.
              </p>
            ) : (
              <p className={styles.hint}>드래그로 회전 · 아래 슬라이더로 관절 조작</p>
            )}
            <Summary state={state} pose={pose} actions={actions} />
          </>
        }
        panel={<Controls lab={lab} fullscreen={{ supported: fsSupported, active: fsActive, toggle: toggleFs }} />}
      >
        <div ref={stageRef} className={styles.stage}>
          {fallback ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.poster} src="/posters/academy-robot-lab/poster.svg" alt="" width={640} height={480} />
          ) : (
            <Scene state={state} pose={pose} reached={ikInfo?.reached ?? true} actions={actions} fpsRef={lab.fpsRef} />
          )}
        </div>
      </HeroSlot>
    </div>
  );
}
