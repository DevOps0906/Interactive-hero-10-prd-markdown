"use client";

import { useId, useState, type FormEvent, type RefObject } from "react";
import { DEMO_LABEL, FLOORS, HOTSPOTS, MATERIALS, TIMES, VIEWS } from "./config";
import { trackEvent, type BlueprintActions, type BlueprintState } from "./useBlueprint";
import type { QualityTier } from "@/lib/hero/performance";
import styles from "./ArchitectureBlueprintReveal.module.css";

interface Props {
  state: BlueprintState;
  actions: BlueprintActions;
  tier: QualityTier;
  reduced: boolean;
  formRef: RefObject<HTMLFormElement | null>;
}

type FormState = "idle" | "invalid" | "sent";
const PROJECT_TYPES = ["주거", "상업·업무", "문화·공공", "리모델링"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 3D 캔버스 밖 HTML 조작 패널 + 상담 문의 데모 폼. 모든 선택은 텍스트 상태(aria-pressed·현재 값)를 함께 제공한다. */
export default function Controls({ state, actions, tier, reduced, formRef }: Props) {
  const uid = useId();
  const { phase, selectedId, viewMode, config, tourStep } = state;
  const disabled = phase !== "ready" && phase !== "fallback";
  const [form, setForm] = useState<FormState>("idle");
  const [email, setEmail] = useState("");
  const [type, setType] = useState(PROJECT_TYPES[0]);
  const [agree, setAgree] = useState(false);

  const floor = FLOORS.find((f) => f.id === selectedId);
  const mat = MATERIALS.find((m) => m.id === config.material);
  const prev = MATERIALS.find((m) => m.id === config.prevMaterial);
  const time = TIMES.find((t) => t.id === config.time);
  const emailBad = form === "invalid" && !EMAIL_RE.test(email);
  const agreeBad = form === "invalid" && !agree;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email) || !agree) {
      setForm("invalid");
      return;
    }
    // 데모: 서버 전송·저장 없음. 입력값은 확인 상태로 넘어가며 즉시 비운다.
    trackEvent("lead_submit", { projectType: type });
    setEmail("");
    setAgree(false);
    setForm("sent");
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>프로젝트 탐색</h2>
        <p className={styles.muted}>
          {DEMO_LABEL} · 아래 값은 모두 예시입니다. 인허가·구조·일조 판단 결과가 아닙니다. 화질: {tier}
          {reduced ? " · 모션 감소 적용" : ""}
        </p>
      </div>

      <div className={styles.grid}>
        <fieldset className={styles.group} disabled={disabled}>
          <legend>층별 탐색</legend>
          <div className={styles.row}>
            {FLOORS.map((f) => (
              <button key={f.id} type="button" className={styles.opt} aria-pressed={selectedId === f.id} onClick={() => actions.select(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.opt} aria-pressed={config.exploded} onClick={actions.explode}>
              층 분리 {config.exploded ? "켜짐" : "꺼짐"}
            </button>
          </div>
          <p className={styles.muted} aria-live="polite">
            현재 선택: {floor ? `${floor.label} (${floor.use})` : "없음"}
          </p>
        </fieldset>

        <fieldset className={styles.group} disabled={disabled}>
          <legend>입면 재질 팔레트</legend>
          <div className={styles.row}>
            {MATERIALS.map((m) => (
              <button key={m.id} type="button" className={styles.opt} aria-pressed={config.material === m.id} onClick={() => actions.material(m.id)}>
                <span className={styles.chip} style={{ background: m.color }} aria-hidden="true" />
                {m.label}
              </button>
            ))}
            <button type="button" className={styles.opt} aria-pressed={config.compare} disabled={config.prevMaterial === config.material} onClick={actions.compare}>
              변경 전후 비교 {config.compare ? "켜짐" : "꺼짐"}
            </button>
          </div>
          <p className={styles.muted} aria-live="polite">
            현재 재질: {config.compare ? `${prev?.label} (비교 중, 변경 후: ${mat?.label})` : mat?.label}. {mat?.note}
          </p>
        </fieldset>

        <fieldset className={styles.group} disabled={disabled}>
          <legend>주야 조명</legend>
          <div className={styles.row}>
            {TIMES.map((t) => (
              <button key={t.id} type="button" className={styles.opt} aria-pressed={config.time === t.id} onClick={() => actions.time(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <p className={styles.muted} aria-live="polite">
            현재 시간대: {time?.label}. {time?.note}
          </p>
        </fieldset>

        <fieldset className={styles.group} disabled={disabled}>
          <legend>카메라 · 투어</legend>
          <div className={styles.row}>
            {(Object.keys(VIEWS) as Array<keyof typeof VIEWS>).map((k) => (
              <button key={k} type="button" className={styles.opt} aria-pressed={viewMode === k && tourStep < 0} onClick={() => actions.view(k)}>
                {VIEWS[k].label}
              </button>
            ))}
            <button type="button" className={styles.opt} aria-pressed={tourStep >= 0} onClick={() => (tourStep >= 0 ? actions.tourStop() : actions.tour(0))}>
              카메라 투어 {tourStep >= 0 ? "종료" : "시작"}
            </button>
            {tourStep >= 0 && tourStep < 3 && (
              <button type="button" className={styles.opt} aria-pressed={state.tourAuto} onClick={() => actions.tourAuto(!state.tourAuto)}>
                자동 진행 {state.tourAuto ? "켜짐" : "꺼짐"}
              </button>
            )}
          </div>
          <p className={styles.muted} aria-live="polite">
            현재 시점: {tourStep >= 0 ? `투어 ${Math.min(tourStep + 1, 3)}/3` : VIEWS[viewMode === "tour" ? "iso" : viewMode].label}
            {state.isAnimating ? " (이동 중)" : ""}
          </p>
        </fieldset>

        <fieldset className={styles.group} disabled={disabled}>
          <legend>프로젝트 핫스팟</legend>
          <div className={styles.row}>
            {HOTSPOTS.map((h) => (
              <button key={h.id} type="button" className={styles.opt} aria-pressed={state.hotspotId === h.id} onClick={() => actions.hotspot(h.id)}>
                {h.label}
              </button>
            ))}
          </div>
          <p className={styles.muted}>선택하면 스테이지의 설명 카드로 포커스가 이동합니다. (Esc: 닫기)</p>
        </fieldset>

        <form ref={formRef} id={`${uid}-inquiry`} className={styles.group} onSubmit={submit} noValidate aria-labelledby={`${uid}-ttl`} tabIndex={-1}>
          <h3 id={`${uid}-ttl`} className={styles.formTitle}>
            상담 프로젝트 문의 <span className={styles.demoTag}>{DEMO_LABEL}</span>
          </h3>
          <p className={styles.muted}>데모 폼입니다. 입력한 내용은 전송·저장되지 않습니다. 실제 이메일을 입력하지 않아도 됩니다.</p>
          <label className={styles.field}>
            프로젝트 유형
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {PROJECT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            연락받을 이메일
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo@example.com" aria-invalid={emailBad} aria-describedby={emailBad ? `${uid}-e` : undefined} autoComplete="off" />
          </label>
          {emailBad && (
            <p id={`${uid}-e`} className={styles.error} role="alert">
              이메일 형식을 확인해 주세요.
            </p>
          )}
          <label className={styles.check}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={agreeBad} />
            데모 안내를 확인했습니다. (실제 수집·보관 없음)
          </label>
          {agreeBad && (
            <p className={styles.error} role="alert">
              확인 항목에 체크해 주세요.
            </p>
          )}
          <div className={styles.row}>
            <button type="submit" className="btn-primary">
              문의 보내기 (데모)
            </button>
          </div>
          {form === "sent" && (
            <p className={styles.success} role="status">
              데모 문의가 접수된 것으로 표시했습니다. 실제로 전송되지 않았습니다.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
