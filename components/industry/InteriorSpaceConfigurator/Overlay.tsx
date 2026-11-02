"use client";

import { useRef, useSyncExternalStore } from "react";
import type { Actions, State } from "./useConfigurator";
import styles from "./InteriorSpaceConfigurator.module.css";

const subscribeFs = (cb: () => void) => {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
};

/** 스테이지 위 비장식 UI: 로딩 상태, 되돌리기/초기화/치수/전체화면, 조작 안내. */
export default function Overlay({ state, actions }: { state: State; actions: Actions }) {
  const root = useRef<HTMLDivElement>(null);
  const isFs = useSyncExternalStore(subscribeFs, () => document.fullscreenElement !== null, () => false);
  const canFs = useSyncExternalStore(() => () => {}, () => document.fullscreenEnabled, () => false);
  const loading = state.phase === "loading";

  const toggleFs = () => {
    const box = root.current?.closest<HTMLElement>(".hero-stagebox");
    if (!box) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void box.requestFullscreen().catch(() => undefined);
  };

  return (
    <div ref={root} className={styles.overlay}>
      <div className={styles.toolbar} role="toolbar" aria-label="장면 도구">
        <button type="button" className={styles.tool} onClick={actions.undo} disabled={state.history.length === 0}>되돌리기</button>
        <button type="button" className={styles.tool} onClick={actions.reset}>초기화</button>
        <button type="button" className={styles.tool} aria-pressed={state.showDims} onClick={actions.toggleDims}>치수</button>
        {canFs && (
          <button type="button" className={styles.tool} aria-pressed={isFs} onClick={toggleFs}>{isFs ? "전체화면 해제" : "전체화면"}</button>
        )}
      </div>
      {loading && (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <span>3D 공간 불러오는 중…</span>
        </div>
      )}
      {state.phase === "fallback" && (
        <p className={styles.fallbackNote} role="status">3D를 표시할 수 없어 정지 이미지로 대체했습니다. 아래 패널에서 소재·가구·견적을 계속 사용할 수 있습니다.</p>
      )}
      <p className={styles.hint}>
        {state.viewMode === "orbit" ? "드래그로 방 돌려보기 · 가구 선택 후 바닥 클릭으로 이동" : "걷기 시점 · 아래 패널에서 위치·방향 변경"}
      </p>
    </div>
  );
}
