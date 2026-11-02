"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import { BOOKING_PATH, DEMO_NOTICE, LAYER_LABEL, LAYER_ORDER, MEDICAL_DISCLAIMER, VIEW_PRESETS, getRegion, mockRegions, mockSlots } from "./config";
import { handoffUrl, type ExplorerActions, type ExplorerState } from "./useExplorer";
import type { QualityTier } from "./types";
import styles from "./AnatomyCareExplorer.module.css";

interface ControlsProps {
  state: ExplorerState;
  actions: ExplorerActions;
  reduced: boolean;
  tier: QualityTier;
  fpsRef: MutableRefObject<number>;
}

const VIEW_LABEL = { ...Object.fromEntries(Object.entries(VIEW_PRESETS).map(([k, v]) => [k, v.label])), custom: "직접 조정" } as Record<string, string>;

/** FPS 표시: 프레임 모니터 값을 1초 주기로 읽는다(성능 측정 기록용). */
function Fps({ fpsRef }: { fpsRef: MutableRefObject<number> }) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(Math.round(fpsRef.current)), 1000);
    return () => window.clearInterval(id);
  }, [fpsRef]);
  return <>{fps > 0 ? `${fps}fps` : "측정 전"}</>;
}

export default function Controls({ state, actions, reduced, tier, fpsRef }: ControlsProps) {
  const region = getRegion(state.selectedId);
  const fallback = state.phase === "fallback";

  return (
    <section className={styles.panel} aria-labelledby="ace-panel-title">
      <div className={styles.panelHead}>
        <h2 id="ace-panel-title">진료 부위 탐색</h2>
        <p className={styles.demo}>{DEMO_NOTICE}</p>
      </div>

      <div className={styles.grid}>
        {/* 접근 가능한 진료과 선택기: 3D 없이도 같은 내용을 탐색 */}
        <fieldset className={styles.group}>
          <legend>부위·진료과 선택</legend>
          <ul className={styles.regionList}>
            {mockRegions.map((r) => {
              const on = state.selectedId === r.id;
              return (
                <li key={r.id}>
                  <button type="button" id={`ace-region-${r.id}`} className={styles.regionBtn} aria-pressed={on} onClick={() => actions.select(on ? null : r.id)}>
                    <strong>{r.label}</strong>
                    <span>{r.department}</span>
                    <span className={styles.state}>{on ? "선택됨" : "선택 안 됨"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={actions.undo} disabled={state.history.length === 0}>이전 선택으로 되돌리기</button>
            <button type="button" className={styles.btn} onClick={actions.reset}>초기화</button>
          </div>
        </fieldset>

        {/* Layer Transparency */}
        <fieldset className={styles.group} disabled={fallback}>
          <legend>레이어 (피부·근육·뼈)</legend>
          <div className={styles.row} role="group" aria-label="레이어 프리셋">
            {Object.entries(VIEW_PRESETS).map(([key, v]) => (
              <button key={key} type="button" className={styles.btn} aria-pressed={state.viewMode === key} onClick={() => actions.setView(key as keyof typeof VIEW_PRESETS)}>
                {v.label}
              </button>
            ))}
          </div>
          <p className={styles.muted} aria-live="polite">현재 보기: {VIEW_LABEL[state.viewMode]}</p>
          {LAYER_ORDER.map((k) => (
            <label key={k} className={styles.slider}>
              <span>{LAYER_LABEL[k]} 투명도 <output>{Math.round(state.layers[k] * 100)}%</output></span>
              <input type="range" min={0} max={1} step={0.05} value={state.layers[k]} onChange={(e) => actions.setLayer(k, Number(e.target.value))} />
            </label>
          ))}
        </fieldset>

        {/* Neutral Motion Demo */}
        <fieldset className={styles.group} disabled={fallback}>
          <legend>일반 움직임 예시</legend>
          <button type="button" className={styles.btn} aria-pressed={state.motion} onClick={() => actions.toggleMotion()}>
            {state.motion ? "움직임 예시 끄기" : "움직임 예시 보기"}
          </button>
          <p className={styles.muted}>어깨·무릎 관절의 일반적인 움직임 예시입니다. 개인의 상태를 보여주거나 진단 결과를 시뮬레이션하지 않습니다.{reduced ? " (모션 감소 설정: 정지 자세로 표시)" : ""}</p>
        </fieldset>

        <section className={styles.group} aria-labelledby="ace-selected">
          <h3 id="ace-selected">선택한 부위 안내</h3>
          <div aria-live="polite">
            {region ? (
              <>
                <p className={styles.dept}>{region.label} · {region.department}</p>
                <div className={styles.cards}>
                  <article className={styles.card}>
                    <h4>일반 설명</h4>
                    <p>{region.summary}</p>
                  </article>
                  <article className={styles.card}>
                    <h4>진료 흐름</h4>
                    <ol>{region.flow.map((f) => <li key={f}>{f}</li>)}</ol>
                  </article>
                  <article className={styles.card}>
                    <h4>검진 안내</h4>
                    <p>{region.checkup}</p>
                  </article>
                </div>
                <h4 className={styles.sub}>의료진 소개 (데모)</h4>
                <ul className={styles.doctors}>
                  {region.doctors.map((d) => (
                    <li key={d.name}><strong>{d.name}</strong> · {d.role}<br /><span className={styles.muted}>{d.note}</span></li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={styles.muted}>모델의 마커를 누르거나 위 목록에서 부위를 선택하면 일반 안내가 표시됩니다.</p>
            )}
          </div>
        </section>

        {/* Appointment Handoff: 진료과 코드만 전달, 증상·민감정보는 받지 않는다 */}
        <section className={styles.group} id="ace-booking" aria-labelledby="ace-booking-title" tabIndex={-1}>
          <h3 id="ace-booking-title">진료과 안내/예약 (데모)</h3>
          {region ? (
            <>
              <p>선택한 진료과: <strong>{region.department}</strong></p>
              <fieldset className={styles.slots}>
                <legend>희망 시간대 (데모 예시)</legend>
                {mockSlots.map((s) => (
                  <label key={s}>
                    <input type="radio" name="ace-slot" checked={state.slot === s} onChange={() => actions.setSlot(s)} /> {s}
                  </label>
                ))}
              </fieldset>
              <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!state.slot} onClick={actions.handoff}>
                예약 페이지로 이동 (데모)
              </button>
              <p role="status" className={styles.muted}>
                {state.handoff
                  ? `데모 확인: 실제 이동 없이 ${handoffUrl(state.handoff)} 로 진료과 코드만 전달하는 흐름을 보여줍니다. 입력한 개인정보는 없습니다.`
                  : state.slot
                    ? "시간대를 선택했습니다. 버튼을 누르면 예약 이동 흐름을 확인할 수 있습니다."
                    : "시간대를 선택하면 버튼이 활성화됩니다."}
              </p>
            </>
          ) : (
            <p className={styles.muted}>먼저 부위를 선택해 주세요. 선택한 진료과 코드만 예약 페이지({BOOKING_PATH})로 전달됩니다.</p>
          )}
          <p className={styles.muted}>{MEDICAL_DISCLAIMER}</p>
        </section>

        <section className={styles.group} aria-labelledby="ace-perf">
          <h3 id="ace-perf">성능 상태</h3>
          <p className={styles.muted}>품질 등급: {tier} · 프레임: <Fps fpsRef={fpsRef} /> · 모션 감소: {reduced ? "켜짐" : "꺼짐"}</p>
        </section>
      </div>
    </section>
  );
}
