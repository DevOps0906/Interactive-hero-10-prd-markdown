"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CAMERA_SHOTS } from "./config";
import type { TrackFn } from "./analytics";
import type { LookbookActions, LookbookState } from "./useLookbook";
import styles from "./FashionAvatarLookbook.module.css";

function subscribeFs(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

/** 스테이지 위 비장식 UI: 상태 칩, 조작 안내, 시점·회전·전체화면 툴바. 키보드로 모두 조작 가능하다. */
export default function Overlay({ state, actions, track }: { state: LookbookState; actions: LookbookActions; track: TrackFn }) {
  const fsBtn = useRef<HTMLButtonElement>(null);
  const fsSupported = useSyncExternalStore(subscribeFs, () => document.fullscreenEnabled === true, () => false);
  const fs = useSyncExternalStore(subscribeFs, () => document.fullscreenElement !== null, () => false);

  // 언마운트 시 전체화면이 남지 않게 한다
  useEffect(
    () => () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  const toggleFullscreen = () => {
    const box = fsBtn.current?.closest<HTMLElement>(".hero-stagebox");
    if (!box) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void box.requestFullscreen().catch(() => undefined);
    track("hero_interact", { control: "fullscreen" });
  };

  const busy = state.phase === "loading" || state.phase === "intro";
  return (
    <>
      <p className={styles.status} role="status">
        {state.phase === "fallback" ? "정지 이미지 모드" : busy ? "모델 불러오는 중…" : state.isAnimating ? "적용 중…" : "준비됨"}
      </p>
      <div className={styles.toolbar} role="toolbar" aria-label="뷰 조작">
        {CAMERA_SHOTS.map((s) => (
          <button key={s.id} type="button" className={styles.tbtn} aria-pressed={state.viewMode === s.id} onClick={() => actions.setShot(s.id)}>
            {s.label}
          </button>
        ))}
        <button type="button" className={styles.tbtn} aria-label="왼쪽으로 45도 회전" onClick={() => actions.turn("nudge", -Math.PI / 4)}>
          ◀
        </button>
        <button type="button" className={styles.tbtn} aria-label="오른쪽으로 45도 회전" onClick={() => actions.turn("nudge", Math.PI / 4)}>
          ▶
        </button>
        {fsSupported && (
          <button ref={fsBtn} type="button" className={styles.tbtn} aria-pressed={fs} onClick={toggleFullscreen}>
            {fs ? "전체화면 종료" : "전체화면"}
          </button>
        )}
      </div>
      <p className={styles.hint}>드래그로 회전 · 아래 패널에서 의상·색상 변경</p>
    </>
  );
}
