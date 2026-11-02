"use client";

import { STATUS_META, VIEW_LABEL, VIEW_NOTICE, formatPrice, unitLabel } from "./config";
import type { UnitRecord } from "./types";
import type { ExplorerActions, ExplorerState } from "./useExplorer";
import styles from "./RealEstateUnitExplorer.module.css";

interface OverlayProps {
  state: ExplorerState;
  actions: ExplorerActions;
  unit: UnitRecord | null;
  fullscreen: boolean;
  onFullscreen(): void;
  onClose(): void;
  onInquiry(): void;
}

/** 스테이지 위 비장식 UI: 조작 툴바(되돌리기·초기화·전체화면) + 선택 호실 요약(모바일은 바텀시트). */
export default function Overlay({ state, actions, unit, fullscreen, onFullscreen, onClose, onInquiry }: OverlayProps) {
  const inCompare = unit ? state.compareIds.includes(unit.id) : false;
  return (
    <div className={styles.overlay}>
      <div className={styles.toolbar} role="toolbar" aria-label="3D 화면 조작">
        <button type="button" className="btn-ghost" disabled={state.history.length === 0} onClick={actions.undo}>
          되돌리기
        </button>
        <button type="button" className="btn-ghost" onClick={actions.reset}>
          초기화
        </button>
        <button type="button" className="btn-ghost" aria-pressed={fullscreen} onClick={onFullscreen}>
          {fullscreen ? "전체화면 종료" : "전체화면"}
        </button>
      </div>
      <p className={styles.badge}>
        시점: {VIEW_LABEL[state.viewMode]}
        {state.isAnimating ? " · 이동 중" : ""}
      </p>
      {state.viewMode === "window" && <p className={styles.viewNotice}>{VIEW_NOTICE}</p>}
      {unit && (
        <section className={styles.sheet} aria-label="선택 호실 요약">
          <div className={styles.sheetHead}>
            <h2>{unitLabel(unit)}</h2>
            <button type="button" className="btn-ghost" onClick={onClose} aria-label="요약 닫기 (ESC)">
              닫기
            </button>
          </div>
          <p className={styles.sheetMeta}>
            <span className={styles.statusTag} data-status={unit.status}>
              {STATUS_META[unit.status].label}
            </span>{" "}
            · 전용 {unit.exclusiveArea}㎡ · {unit.facing}향 · 호가 {formatPrice(unit.priceMan)} <em>(데모 예시)</em>
          </p>
          <div className={styles.sheetActions}>
            <button type="button" className="btn-primary" onClick={onInquiry}>
              이 호실 문의
            </button>
            <button type="button" className="btn-ghost" aria-pressed={inCompare} onClick={() => actions.toggleCompare(unit.id)}>
              {inCompare ? "비교에서 빼기" : "비교에 담기"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
