"use client";

import { useEffect, useRef, useState } from "react";
import { MATERIALS, MATERIAL_IDS, PALETTE, PARTS, SIZES, STATUS_LABEL, VIEWS, colorOf, resolveVariant } from "./config";
import type { Actions, State } from "./useConfigurator";
import type { MaterialId } from "./types";
import styles from "./SneakerConfigurator.module.css";

interface P {
  state: State;
  actions: Actions;
  /** 같은 컨트롤을 두 곳(스테이지 dock·하단 시트)에 그릴 때 radio name 충돌을 막는다 */
  prefix: string;
}

/** 부위 선택 + 색상 스와치. 선택 상태는 색 이름 텍스트로도 보여 준다. */
export function ColorPicker({ state, actions, prefix }: P) {
  const part = PARTS.find((p) => p.id === state.selectedId) ?? PARTS[0];
  const current = colorOf(state.config.colors[part.id]);
  return (
    <fieldset className={styles.group}>
      <legend>색상 (부위별)</legend>
      <div className={styles.row} role="radiogroup" aria-label="색을 바꿀 부위">
        {PARTS.map((p) => (
          <label key={p.id} className={styles.chipLabel}>
            <input type="radio" name={`${prefix}-part`} checked={state.selectedId === p.id} onChange={() => actions.select(p.id)} />
            <span>{p.label}</span>
          </label>
        ))}
      </div>
      <div className={styles.swatches} role="radiogroup" aria-label={`${part.label} 색상`}>
        {PALETTE.map((c) => (
          <label key={c.id} className={styles.swatchLabel}>
            <input type="radio" name={`${prefix}-color`} checked={current.id === c.id} onChange={() => actions.setColor(part.id, c.id)} />
            <span className={styles.swatch} style={{ background: c.hex }} />
            <span className={styles.srOnly}>{c.name}</span>
          </label>
        ))}
      </div>
      <p className={styles.state}>
        {part.label}: <b>{current.name}</b> <span className={styles.muted}>({part.desc})</span>
      </p>
    </fieldset>
  );
}

const SWATCH_BG: Record<MaterialId, string> = {
  canvas: "repeating-linear-gradient(0deg, #cfcfcf 0 2px, #f1f1f1 2px 4px), repeating-linear-gradient(90deg, #cfcfcf 0 2px, #f1f1f1 2px 4px)",
  mesh: "radial-gradient(circle, #8f8f8f 28%, #f4f4f4 32%) 0 0 / 7px 7px",
  suede: "radial-gradient(circle, #d8d8d8 0 1px, #ececec 1px) 0 0 / 3px 3px",
};

export function MaterialPicker({ state, actions, prefix }: P) {
  const m = MATERIALS[state.config.material];
  return (
    <fieldset className={styles.group}>
      <legend>소재 (갑피)</legend>
      <div className={styles.row} role="radiogroup" aria-label="갑피 소재">
        {MATERIAL_IDS.map((id) => (
          <label key={id} className={styles.chipLabel}>
            <input type="radio" name={`${prefix}-material`} checked={state.config.material === id} onChange={() => actions.setMaterial(id)} />
            <span>
              <i className={styles.matSwatch} style={{ background: SWATCH_BG[id] }} aria-hidden="true" />
              {MATERIALS[id].label}
            </span>
          </label>
        ))}
        <button type="button" className={styles.chip} onClick={() => actions.setView("detail")} aria-pressed={state.viewMode === "detail"}>
          확대해서 비교
        </button>
      </div>
      <p className={styles.state}>
        {m.label}: <span className={styles.muted}>{m.note}</span>
        {m.surcharge ? <span className={styles.muted}> · +{m.surcharge.toLocaleString("ko-KR")}원 (데모)</span> : null}
      </p>
    </fieldset>
  );
}

export function SizePicker({ state, actions, prefix }: P) {
  return (
    <fieldset className={styles.group}>
      <legend>사이즈 (mm)</legend>
      <div className={styles.row} role="radiogroup" aria-label="사이즈">
        {SIZES.map((size) => {
          const v = resolveVariant({ ...state.config, size });
          return (
            <label key={size} className={styles.chipLabel} data-status={v.status}>
              <input type="radio" name={`${prefix}-size`} checked={state.config.size === size} onChange={() => actions.setSize(size)} />
              <span>
                {size}
                {v.status !== "in" ? <em>{STATUS_LABEL[v.status]}</em> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 스테이지 위 도구 모음: 각도·분해·회전·되돌리기·초기화·전체화면. */
export function Toolbar({ state, actions }: Omit<P, "prefix">) {
  const root = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFullscreen = async () => {
    const box = root.current?.closest<HTMLElement>(".hero-stagebox");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (box?.requestFullscreen) await box.requestFullscreen();
      else actions.notify("info", "이 브라우저는 전체화면을 지원하지 않습니다.");
    } catch {
      actions.notify("error", "전체화면으로 전환하지 못했습니다.");
    }
  };

  const ready = state.phase !== "fallback" && !state.staticMode;
  return (
    <div ref={root} className={styles.toolbar} role="toolbar" aria-label="3D 보기 도구">
      <div className={styles.toolGroup} role="group" aria-label="카메라 각도">
        {VIEWS.filter((v) => v.id !== "detail").map((v) => (
          <button key={v.id} type="button" className={styles.chip} aria-pressed={state.viewMode === v.id} disabled={!ready} onClick={() => actions.setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <div className={styles.toolGroup} role="group" aria-label="동작">
        <button type="button" className={styles.chip} aria-pressed={state.exploded} disabled={!ready} onClick={() => actions.setExploded()}>
          {state.exploded ? "구조 닫기" : "구조 분해"}
        </button>
        <button type="button" className={styles.chip} disabled={!ready || state.isAnimating} onClick={actions.spin}>
          360° 회전
        </button>
      </div>
      <div className={styles.toolGroup} role="group" aria-label="편집">
        <button type="button" className={styles.chip} disabled={!state.past.length} onClick={actions.undo}>
          되돌리기
        </button>
        <button type="button" className={styles.chip} disabled={!state.future.length} onClick={actions.redo}>
          다시
        </button>
        <button type="button" className={styles.chip} onClick={actions.reset}>
          초기화
        </button>
        <button type="button" className={styles.chip} aria-pressed={fs} onClick={toggleFullscreen}>
          {fs ? "전체화면 닫기" : "전체화면"}
        </button>
        <button type="button" className={styles.chip} aria-pressed={state.staticMode} disabled={state.phase === "fallback"} onClick={() => actions.setStatic(!state.staticMode)}>
          {state.staticMode ? "3D로 보기" : "정적 이미지"}
        </button>
      </div>
    </div>
  );
}
