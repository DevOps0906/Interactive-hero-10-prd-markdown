"use client";

import { useEffect, useRef } from "react";
import {
  CHART_ROWS,
  DEFAULT_TOOTH_ID,
  DISCLAIMERS,
  KIND_INFO,
  LAYERS,
  PROCEDURES,
  PROCEDURE_BY_ID,
  TEETH_BY_ID,
  toothLabel,
  type DentalData,
  type Jaw,
} from "./config";
import type { ExplorerActions, ExplorerState } from "./useExplorer";
import { track } from "./useExplorer";
import Appointment from "./Appointment";
import styles from "./DentalProcedureExplorer.module.css";

interface PanelProps {
  state: ExplorerState;
  actions: ExplorerActions;
  data: DentalData;
  tierLabel: string;
  onFullscreen: () => void;
}

const JAW_LABEL: Record<Jaw, string> = { upper: "위턱", lower: "아래턱" };

export function focusAppointment() {
  const el = document.getElementById("appointment");
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  el?.querySelector<HTMLElement>("select, input")?.focus({ preventScroll: true });
}

/** 선택 상태 요약(스테이지 위 카드 / 모바일 바텀시트). 3D와 같은 state 에서 렌더링. */
export function Summary({ state, actions, data }: Pick<PanelProps, "state" | "actions" | "data">) {
  const id = state.selectedId;
  const focusTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(focusTimer.current), []);
  if (!id) return null;
  const tooth = TEETH_BY_ID[id];
  const info = KIND_INFO[tooth.kind];
  const proc = PROCEDURE_BY_ID[state.procedureId];
  const doctor = data.doctors.find((d) => d.procedureId === state.procedureId);
  const close = () => {
    actions.select(null);
    window.clearTimeout(focusTimer.current);
    focusTimer.current = window.setTimeout(() => document.getElementById(`tooth-btn-${id}`)?.focus(), 0);
  };
  return (
    <aside className={styles.summary} role="region" aria-label="선택한 치아 요약">
      <div className={styles.summaryHead}>
        <h2>{toothLabel(id)}</h2>
        <button type="button" className={styles.btn} onClick={close} aria-label="선택 닫기 (Esc)">
          닫기
        </button>
      </div>
      <p>
        <strong>{info.title}</strong> · 역할: {info.role}
      </p>
      <p>{info.summary}</p>
      <p>
        절차 예시: {proc.name} {state.stepIndex + 1}/{proc.steps.length} — {proc.steps[state.stepIndex].title}
      </p>
      {doctor && (
        <p>
          연결 의료진(DEMO): {doctor.name} · {doctor.hours}
        </p>
      )}
      <p className={styles.notice}>{DISCLAIMERS.general}</p>
      <div className={styles.summaryActions}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            track("hero_cta_click", { from: "summary", toothId: id });
            focusAppointment();
          }}
        >
          이 항목으로 상담 예약
        </button>
      </div>
    </aside>
  );
}

export default function Panel({ state, actions, data, tierLabel, onFullscreen }: PanelProps) {
  const proc = PROCEDURE_BY_ID[state.procedureId];
  const step = proc.steps[state.stepIndex];
  const targetId = state.selectedId ?? DEFAULT_TOOTH_ID;
  const doctor = data.doctors.find((d) => d.procedureId === state.procedureId);
  const cutaway = state.viewMode === "cutaway";
  const activeLayer = LAYERS.find((l) => l.id === state.layerId);
  const busy = state.isAnimating;

  return (
    <section className={styles.panel} aria-labelledby="dpe-panel-title">
      <div className={styles.panelHead}>
        <h2 id="dpe-panel-title">치아 선택 · 절차 안내</h2>
        <p className={styles.muted} role="status" aria-live="polite">
          선택: {state.selectedId ? toothLabel(state.selectedId) : "없음"} · 보기: {cutaway ? "단면도" : "치열"} · 절차: {proc.name} {state.stepIndex + 1}/{proc.steps.length}
          {busy ? " · 이동 중" : ""}
        </p>
      </div>
      <p className={styles.notice}>
        <span className={styles.badge}>DEMO</span> {DISCLAIMERS.demo} {DISCLAIMERS.general}
      </p>

      <div className={styles.grid} style={{ marginTop: "calc(var(--spacing) * 4)" }}>
        {/* 1. 치아 선택 (키보드·스크린리더용 대안 경로) */}
        <fieldset className={`${styles.group} ${styles.span2}`}>
          <legend>치아 선택 (FDI 번호)</legend>
          <div className={styles.chart}>
            {(["upper", "lower"] as const).map((jaw) => (
              <div key={jaw} role="group" aria-label={JAW_LABEL[jaw]} className={styles.chartRow}>
                {CHART_ROWS[jaw].map((id) => (
                  <button
                    key={id}
                    id={`tooth-btn-${id}`}
                    type="button"
                    className={styles.btn}
                    aria-pressed={state.selectedId === id}
                    aria-label={toothLabel(id)}
                    title={toothLabel(id)}
                    onClick={() => actions.select(state.selectedId === id ? null : id)}
                  >
                    {id}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className={styles.muted}>3D 치아를 직접 눌러도 선택됩니다. 화면 왼쪽이 환자의 오른쪽입니다.</p>
        </fieldset>

        {/* 2. 조작 */}
        <fieldset className={styles.group}>
          <legend>보기 조작</legend>
          <div className={styles.row}>
            <button type="button" className={styles.btn} aria-pressed={!cutaway} onClick={() => actions.setView("arch")}>
              치열 보기
            </button>
            <button type="button" className={styles.btn} aria-pressed={cutaway} onClick={() => actions.setView("cutaway")}>
              단면도 보기
            </button>
          </div>
          <div className={styles.row} style={{ marginTop: "calc(var(--spacing) * 2)" }}>
            <button type="button" className={styles.btn} onClick={() => actions.nudge(-1)} aria-label="왼쪽으로 회전">
              ◀ 회전
            </button>
            <button type="button" className={styles.btn} onClick={() => actions.nudge(1)} aria-label="오른쪽으로 회전">
              회전 ▶
            </button>
            <button type="button" className={styles.btn} onClick={actions.undo} disabled={state.history.length === 0}>
              되돌리기
            </button>
            <button type="button" className={styles.btn} onClick={actions.reset}>
              초기화
            </button>
            <button type="button" className={styles.btn} onClick={onFullscreen}>
              전체화면
            </button>
          </div>
          <p className={styles.muted}>
            드래그로 회전(가로), 세로 스와이프는 페이지 스크롤. 3D 품질: {tierLabel}. 되돌리기는 이전 선택으로 돌아갑니다(최대 20단계).
          </p>
        </fieldset>

        {/* 3. 절차 스테퍼 */}
        <fieldset className={styles.group}>
          <legend>절차 단계 (일반 예시)</legend>
          <div className={styles.row} role="group" aria-label="절차 종류">
            {PROCEDURES.map((p) => (
              <button key={p.id} type="button" className={styles.btn} aria-pressed={state.procedureId === p.id} onClick={() => actions.setProcedure(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <p className={styles.muted}>{proc.summary}</p>
          <ol className={styles.steps}>
            {proc.steps.map((s, i) => (
              <li key={s.title}>
                <button type="button" aria-current={i === state.stepIndex ? "step" : undefined} onClick={() => actions.setStep(i)}>
                  {i + 1}. {s.title}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.stepBody} aria-live="polite">
            <strong>
              {state.stepIndex + 1}단계 · {step.title}
            </strong>
            <p>{step.body}</p>
            <p className={styles.muted}>
              표시 대상: {toothLabel(targetId)}
              {state.selectedId ? "" : " (선택 전 예시 치아)"} · 특정 환자의 사례가 아닙니다.
            </p>
          </div>
          <div className={styles.row} style={{ marginTop: "calc(var(--spacing) * 2)" }}>
            <button type="button" className={styles.btn} disabled={state.stepIndex === 0} onClick={() => actions.setStep(state.stepIndex - 1)}>
              이전 단계
            </button>
            <button type="button" className={styles.btn} disabled={state.stepIndex >= proc.steps.length - 1} onClick={() => actions.setStep(state.stepIndex + 1)}>
              다음 단계
            </button>
          </div>
        </fieldset>

        {/* 4. 단면도 */}
        <fieldset className={styles.group}>
          <legend>단면도 (일반 해부학)</legend>
          {!cutaway && (
            <p className={styles.muted}>
              &quot;단면도 보기&quot;를 누르면 {toothLabel(targetId)}의 내부 구조를 층별로 볼 수 있습니다.
            </p>
          )}
          <ul className={styles.layerList}>
            {LAYERS.map((l) => (
              <li key={l.id}>
                <button type="button" className={styles.btn} style={{ width: "100%", justifyContent: "flex-start" }} aria-pressed={state.layerId === l.id} disabled={!cutaway} onClick={() => actions.setLayer(state.layerId === l.id ? null : l.id)}>
                  <span className={styles.chip} style={{ background: l.color }} aria-hidden="true" />
                  {l.name}
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.muted} aria-live="polite">
            {activeLayer ? `${activeLayer.name}: ${activeLayer.text}` : "층을 선택하면 설명이 표시됩니다. 모델은 일반적인 구조를 단순화한 도식입니다."}
          </p>
        </fieldset>

        {/* 5. 전·후 비교 */}
        <fieldset className={styles.group}>
          <legend>전·후 비교 (교육용 도식)</legend>
          <div className={styles.row} role="group" aria-label="전후 비교">
            {(["off", "before", "after"] as const).map((v) => (
              <button key={v} type="button" className={styles.btn} aria-pressed={state.beforeAfter === v} disabled={cutaway} onClick={() => actions.setBeforeAfter(v)}>
                {v === "off" ? "끄기" : v === "before" ? "도식 전" : "도식 후"}
              </button>
            ))}
          </div>
          <p className={styles.notice}>
            <strong>{DISCLAIMERS.beforeAfter}</strong>
          </p>
          <p className={styles.muted} aria-live="polite">
            현재: {state.beforeAfter === "off" ? "비교 끔" : state.beforeAfter === "before" ? `${toothLabel(targetId)} — 문제가 있는 상태를 가정한 도식` : `${toothLabel(targetId)} — 보철물을 씌운 상태를 가정한 도식`}
          </p>
        </fieldset>

        {/* 6. 의료진 연결 */}
        <fieldset className={`${styles.group} ${styles.doctor}`}>
          <legend>의료진·진료시간 (DEMO)</legend>
          {doctor && (
            <dl>
              <div>
                <dt>진료 항목</dt>
                <dd>{proc.name}</dd>
              </div>
              <div>
                <dt>의료진</dt>
                <dd>{doctor.name}</dd>
              </div>
              <div>
                <dt>진료 분야</dt>
                <dd>{doctor.field}</dd>
              </div>
              <div>
                <dt>진료 시간</dt>
                <dd>{doctor.hours}</dd>
              </div>
            </dl>
          )}
          <p className={styles.muted}>실제 의료진·진료시간은 병원이 제공한 심의 완료 정보로 교체됩니다.</p>
        </fieldset>

        {/* 7. 예약 */}
        <fieldset className={`${styles.group} ${styles.span2}`} id="appointment">
          <legend>상담 예약 (DEMO)</legend>
          <Appointment data={data} procedureId={state.procedureId} toothId={state.selectedId} />
        </fieldset>
      </div>
    </section>
  );
}
