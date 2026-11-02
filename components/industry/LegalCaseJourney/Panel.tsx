"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { DEMO_LABEL, LEGAL_NOTICE } from "./config";
import type { ServiceData, ViewMode } from "./types";
import type { JourneyActions, JourneyState } from "./useJourneyState";
import styles from "./LegalCaseJourney.module.css";

export type Track = (name: "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit", payload?: Record<string, string | number>) => void;

interface PanelProps {
  services: ServiceData[];
  service: ServiceData;
  state: JourneyState;
  actions: JourneyActions;
  track: Track;
  canFullscreen: boolean;
  onFullscreen: () => void;
  onCta: () => void;
}

const VIEWS: { id: ViewMode; label: string }[] = [
  { id: "overview", label: "전체 보기" },
  { id: "process", label: "절차 보기" },
  { id: "documents", label: "서류 보기" },
];
const VIEW_LABEL: Record<ViewMode, string> = { overview: "전체", process: "절차", documents: "서류" };

export default function Panel({ services, service, state, actions, track, canFullscreen, onFullscreen, onCta }: PanelProps) {
  const step = service.steps[state.stepIndex] ?? service.steps[0];
  const owned = state.owned[service.id] ?? [];
  const doc = service.docs.find((d) => d.id === state.docId) ?? null;
  const docBtns = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastTrigger = useRef<string | null>(null);

  const closeDoc = () => {
    actions.openDoc(null);
    const id = lastTrigger.current;
    lastTrigger.current = null;
    if (id) requestAnimationFrame(() => docBtns.current[id]?.focus());
  };

  // ESC 로 서류 설명 닫기
  useEffect(() => {
    if (!state.docId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        actions.openDoc(null);
        const id = lastTrigger.current;
        lastTrigger.current = null;
        if (id) requestAnimationFrame(() => docBtns.current[id]?.focus());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.docId, actions]);

  const names = (ids: string[]) => ids.map((id) => service.steps.find((s) => s.id === id)?.label).filter(Boolean).join(", ");

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>업무 선택과 절차 탐색</h2>
        <span className={styles.demo}>{DEMO_LABEL}</span>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        현재 선택: {service.label} · 보기: {VIEW_LABEL[state.viewMode]} · 단계: {step.label}
        {state.isAnimating ? " (이동 중)" : ""}
      </p>

      <div className={styles.grid}>
        {/* 인터랙션 1: Service Selector + 컨트롤 */}
        <fieldset className={styles.group}>
          <legend>상황 선택</legend>
          <div className={styles.row}>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.chipBtn}
                aria-pressed={s.id === state.selectedId}
                onClick={() => {
                  actions.selectService(s.id);
                  track("hero_select", { service: s.id });
                }}
              >
                {s.label}
                {s.id === state.selectedId ? <span className={styles.srOnly}> (선택됨)</span> : null}
              </button>
            ))}
          </div>
          <p className={styles.muted}>{service.tagline}</p>
          <div className={styles.row} role="group" aria-label="보기 모드">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={styles.chipBtn}
                aria-pressed={state.viewMode === v.id}
                onClick={() => {
                  actions.setView(v.id);
                  track("hero_interact", { view: v.id });
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.ghostBtn} onClick={actions.undo} disabled={state.history.length === 0}>
              되돌리기
            </button>
            <button type="button" className={styles.ghostBtn} onClick={actions.reset}>
              초기화
            </button>
            {canFullscreen && (
              <button type="button" className={styles.ghostBtn} onClick={onFullscreen}>
                전체화면
              </button>
            )}
          </div>
        </fieldset>

        {/* 인터랙션 3·4: 단계 탐색 + 선행 작업 */}
        <fieldset className={styles.group}>
          <legend>절차 타임라인</legend>
          <ol className={styles.steps}>
            {service.steps.map((s, i) => {
              const current = state.viewMode === "process" && i === state.stepIndex;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={styles.stepBtn}
                    aria-current={current ? "step" : undefined}
                    onClick={() => {
                      actions.selectStep(i);
                      track("hero_interact", { step: s.id });
                    }}
                  >
                    <span className={styles.stepNo}>{i + 1}</span>
                    <span>
                      <strong>{s.label}</strong>
                      {current ? <span className={styles.srOnly}> (현재 단계)</span> : null}
                      <span className={styles.muted2}>{s.requires.length ? `선행: ${names(s.requires)}` : "선행 작업 없음"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className={styles.detail}>{step.summary}</p>
          <div className={styles.row}>
            <button type="button" className={styles.ghostBtn} disabled={state.stepIndex === 0} onClick={() => actions.selectStep(state.stepIndex - 1)}>
              이전 단계
            </button>
            <button type="button" className={styles.ghostBtn} disabled={state.stepIndex === service.steps.length - 1} onClick={() => actions.selectStep(state.stepIndex + 1)}>
              다음 단계
            </button>
          </div>
        </fieldset>

        {/* 인터랙션 2·5: 서류 스택 + 체크리스트 */}
        <fieldset className={styles.group}>
          <legend>준비 서류 (예시)</legend>
          <ul className={styles.docs}>
            {service.docs.map((d) => (
              <li key={d.id}>
                <input
                  id={`lcj-own-${d.id}`}
                  type="checkbox"
                  checked={owned.includes(d.id)}
                  onChange={() => {
                    actions.toggleOwned(d.id);
                    track("hero_interact", { check: d.id });
                  }}
                />
                <label htmlFor={`lcj-own-${d.id}`}>
                  <span className={styles.srOnly}>보유: </span>
                  {d.name}
                </label>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  ref={(el) => {
                    docBtns.current[d.id] = el;
                  }}
                  aria-expanded={state.docId === d.id}
                  aria-label={`${d.name} 설명 보기`}
                  onClick={() => {
                    lastTrigger.current = d.id;
                    actions.openDoc(state.docId === d.id ? null : d.id);
                  }}
                >
                  설명
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.docDetail} role="region" aria-live="polite" aria-label="서류 설명">
            {doc ? (
              <>
                <strong>{doc.name}</strong>
                <p>{doc.desc}</p>
                <button type="button" className={styles.ghostBtn} onClick={closeDoc}>
                  닫기 (Esc)
                </button>
              </>
            ) : (
              <p className={styles.muted}>서류의 &lsquo;설명&rsquo;을 누르거나 3D 카드를 클릭하면 설명이 표시됩니다.</p>
            )}
          </div>
        </fieldset>

        {/* 인터랙션 5·7: 준비 현황 + 면책, 모바일은 바텀시트 */}
        <details className={styles.sheet} open>
          <summary>
            <span>요약 · 준비 현황 {owned.length}/{service.docs.length}</span>
          </summary>
          <div className={styles.sheetBody}>
            <p className={styles.summaryLine}>
              <strong>{service.label}</strong> · 현재 단계 {step.label}
            </p>
            <progress className={styles.progress} max={service.docs.length} value={owned.length} aria-label="보유 서류 준비 현황" />
            <p className={styles.muted}>
              선택한 보유 서류 {owned.length}개 / 예시 목록 {service.docs.length}개. 참고용 표시이며 법적 완비 여부를 판정하지 않습니다.
            </p>
            <p className={styles.muted}>기간: {service.durationNote}</p>
            <p className={styles.muted}>비용: {service.costNote}</p>
            <button type="button" className={styles.primaryBtn} onClick={onCta}>
              업무 상담 신청
            </button>
          </div>
        </details>
      </div>

      <Intake service={service} track={track} />
      <p className={styles.legal}>{LEGAL_NOTICE}</p>
    </div>
  );
}

// ───────── 인터랙션 6: Privacy-first Intake (사건 상세 미수집, 전송·저장 없음) ─────────
const CONTACT_RE = /^(0\d{1,2}-?\d{3,4}-?\d{4}|[^\s@]+@[^\s@]+\.[^\s@]+)$/;

function Intake({ service, track }: { service: ServiceData; track: Track }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [method, setMethod] = useState("phone");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "호칭(이름 또는 별칭)을 입력해 주세요.";
    if (!CONTACT_RE.test(contact.trim())) next.contact = "전화번호 또는 이메일 형식을 확인해 주세요.";
    if (!agree) next.agree = "최소 정보 사용에 동의해야 신청할 수 있습니다.";
    setErrors(next);
    setDone(false);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(`lcj-${first}`)?.focus();
      return;
    }
    track("lead_submit", { service: service.id }); // 개인정보 제외
    setName("");
    setContact("");
    setAgree(false);
    setDone(true);
  };

  return (
    <form id="lcj-intake" className={styles.intake} onSubmit={submit} noValidate aria-labelledby="lcj-intake-title">
      <h3 id="lcj-intake-title">업무 상담 신청 ({service.label})</h3>
      <p className={styles.privacy}>
        사건 상세, 주민등록번호, 계좌 등 민감한 정보는 입력하지 마세요. 상담 연락에 필요한 최소 정보만 받으며, 이 데모는 입력값을 전송하거나 저장하지 않습니다.
      </p>
      <div className={styles.field}>
        <label htmlFor="lcj-name">호칭 (이름 또는 별칭)</label>
        <input id="lcj-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={30} aria-invalid={!!errors.name} aria-describedby={errors.name ? "lcj-name-err" : undefined} />
        {errors.name && <span id="lcj-name-err" role="alert" className={styles.err}>{errors.name}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="lcj-contact">연락처 (전화 또는 이메일)</label>
        <input id="lcj-contact" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="off" maxLength={60} aria-invalid={!!errors.contact} aria-describedby={errors.contact ? "lcj-contact-err" : undefined} />
        {errors.contact && <span id="lcj-contact-err" role="alert" className={styles.err}>{errors.contact}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="lcj-method">희망 상담 방식</label>
        <select id="lcj-method" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="phone">전화</option>
          <option value="visit">방문</option>
          <option value="video">화상</option>
        </select>
      </div>
      <div className={styles.check}>
        <input id="lcj-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} aria-invalid={!!errors.agree} />
        <label htmlFor="lcj-agree">상담 연락을 위한 최소 정보 사용에 동의합니다. (데모)</label>
      </div>
      {errors.agree && <span role="alert" className={styles.err}>{errors.agree}</span>}
      <button type="submit" className={styles.primaryBtn}>
        상담 신청 (데모)
      </button>
      {done && (
        <p className={styles.ok} role="status">
          [데모] 신청 확인 화면입니다. 실제로 전송·저장되지 않았습니다. 희망 방식: {method === "phone" ? "전화" : method === "visit" ? "방문" : "화상"}
        </p>
      )}
    </form>
  );
}
