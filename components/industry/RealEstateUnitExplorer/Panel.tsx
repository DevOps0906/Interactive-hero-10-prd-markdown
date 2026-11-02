"use client";

import { useEffect, useRef, useState, type FormEvent, type MutableRefObject, type RefObject } from "react";
import { ASSET_CHECKLIST, DEMO_LABEL, DEMO_NOTICE, FLOOR_MAX, FLOOR_MIN, STATUS_META, STATUS_ORDER, VIEW_LABEL, VIEW_NOTICE, formatPrice, unitLabel } from "./config";
import type { UnitRecord, UnitStatus, ViewMode } from "./types";
import { track, type ExplorerActions, type ExplorerState } from "./useExplorer";
import styles from "./RealEstateUnitExplorer.module.css";

const FLOORS = Array.from({ length: FLOOR_MAX - FLOOR_MIN + 1 }, (_, i) => FLOOR_MAX - i);
const VIEW_MODES: ViewMode[] = ["exterior", "window", "floorplan"];
const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

interface PanelProps {
  units: UnitRecord[]; // 상태 덮어쓰기가 반영된 목록
  byId: Map<string, UnitRecord>;
  state: ExplorerState;
  actions: ExplorerActions;
  fpsRef: MutableRefObject<number>;
  formRef: RefObject<HTMLElement | null>;
}

function StatusTag({ status }: { status: UnitStatus }) {
  return (
    <span className={styles.statusTag} data-status={status}>
      {STATUS_META[status].label}
    </span>
  );
}

export default function Panel({ units, byId, state, actions, fpsRef, formRef }: PanelProps) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(Math.round(fpsRef.current)), 1000);
    return () => window.clearInterval(id);
  }, [fpsRef]);

  const selected = state.selectedId ? (byId.get(state.selectedId) ?? null) : null;
  const floorUnits = state.floor === null ? [] : units.filter((u) => u.floor === state.floor);
  const compare = state.compareIds.map((id) => byId.get(id)).filter((u): u is UnitRecord => !!u);
  const busy = state.phase === "loading";

  return (
    <section className={styles.panel} aria-labelledby="reue-panel-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="reue-panel-title">동·층·호실 탐색</h2>
          <p className={styles.muted}>
            <b className={styles.demoTag}>{DEMO_LABEL}</b> {DEMO_NOTICE}
          </p>
        </div>
      </div>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {state.phase === "loading" ? "3D 모델 불러오는 중" : state.phase === "fallback" ? `3D 비활성: ${state.error ?? ""}` : "3D 준비 완료"}
        {state.notice ? ` ${state.notice}` : ""}
      </p>
      {state.notice && <p className={styles.notice}>{state.notice}</p>}

      <div className={styles.grid}>
        <fieldset className={styles.group}>
          <legend>101동 · 층 선택</legend>
          <div className={styles.row} role="group" aria-label="층 선택">
            {FLOORS.map((f) => (
              <button key={f} type="button" className={styles.chipBtn} aria-pressed={state.floor === f} disabled={busy} onClick={() => actions.setFloor(state.floor === f ? null : f)}>
                {f}층
              </button>
            ))}
          </div>
          <p className={styles.muted}>선택 층: {state.floor === null ? "없음 (전체 외관)" : `${state.floor}층`}</p>
          <div className={styles.row}>
            <button type="button" className={styles.chipBtn} aria-pressed={state.cutaway} disabled={busy || state.floor === null} onClick={actions.toggleCutaway}>
              단면 보기 {state.cutaway ? "켜짐" : "꺼짐"}
            </button>
          </div>
          <p className={styles.muted}>{state.floor === null ? "단면 보기는 층을 먼저 선택하세요." : "선택 층 위쪽 외피를 숨기고 복도·호실 구성을 단순화합니다."}</p>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>분양 상태 레이어 (3)</legend>
          <div className={styles.row} role="group" aria-label="분양 상태 레이어">
            {STATUS_ORDER.map((s) => {
              const n = units.filter((u) => u.status === s).length;
              return (
                <button key={s} type="button" className={styles.chipBtn} data-status={s} aria-pressed={state.layers[s]} disabled={busy} onClick={() => actions.toggleLayer(s)}>
                  {STATUS_META[s].label} {n}호 · {state.layers[s] ? "표시" : "숨김"}
                </button>
              );
            })}
          </div>
          <p className={styles.muted}>색상과 함께 글자로도 상태를 표시합니다. 숨긴 상태의 호실은 3D에서 흐리게 보이고 선택되지 않습니다.</p>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>시점 프리셋</legend>
          <div className={styles.row} role="group" aria-label="시점 프리셋">
            {VIEW_MODES.map((m) => (
              <button key={m} type="button" className={styles.chipBtn} aria-pressed={state.viewMode === m} disabled={busy || (m === "window" && !selected)} onClick={() => actions.setView(m)}>
                {VIEW_LABEL[m]}
              </button>
            ))}
          </div>
          <p className={styles.muted}>
            현재 시점: {VIEW_LABEL[state.viewMode]}
            {selected && state.viewMode === "window" ? ` (${selected.facing}향)` : ""}. {VIEW_NOTICE}
          </p>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>{state.floor === null ? "호실 목록" : `${state.floor}층 호실 (${floorUnits.length})`}</legend>
          {state.floor === null ? (
            <p className={styles.muted}>층을 선택하면 해당 층의 호실을 고를 수 있습니다. 3D 건물에서 호실을 눌러 바로 선택할 수도 있습니다.</p>
          ) : (
            <ul className={styles.unitList}>
              {floorUnits.map((u) => (
                <li key={u.id}>
                  <button type="button" data-unit-btn={u.id} className={styles.unitBtn} aria-pressed={state.selectedId === u.id} disabled={busy || !state.layers[u.status]} onClick={() => actions.select(u.id)}>
                    <strong>{u.ho}호</strong>
                    <span>
                      {u.facing}향 · 전용 {u.exclusiveArea}㎡
                    </span>
                    <StatusTag status={u.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </div>

      <div className={styles.wide}>
        <section className={styles.group} aria-labelledby="reue-summary-title">
          <h3 id="reue-summary-title">선택 호실 정보</h3>
          <div aria-live="polite">
            {selected ? (
              <>
                <p className={styles.sumHead}>
                  <strong>{unitLabel(selected)}</strong> <StatusTag status={selected.status} /> <span className={styles.muted}>타입 {selected.type}</span>
                </p>
                <dl className={styles.spec}>
                  <div><dt>향(창 방향)</dt><dd>{selected.facing}향</dd></div>
                  <div><dt>전용면적</dt><dd>{selected.exclusiveArea}㎡</dd></div>
                  <div><dt>공급면적</dt><dd>{selected.supplyArea}㎡</dd></div>
                  <div><dt>호가</dt><dd>{formatPrice(selected.priceMan)} <em>(데모 예시)</em></dd></div>
                  <div><dt>관리비</dt><dd>월 {selected.maintenanceFeeMan}만원 <em>(데모 예시)</em></dd></div>
                  <div><dt>정보 갱신</dt><dd>{selected.updatedAt}</dd></div>
                </dl>
              </>
            ) : (
              <p className={styles.muted}>선택된 호실이 없습니다. 3D 건물 또는 호실 목록에서 호실을 선택하세요.</p>
            )}
          </div>
          {selected && (
            <div className={styles.row}>
              <button type="button" className="btn-ghost" aria-pressed={state.compareIds.includes(selected.id)} onClick={() => actions.toggleCompare(selected.id)}>
                {state.compareIds.includes(selected.id) ? "비교에서 빼기" : "비교에 담기"}
              </button>
              <label className={styles.inline}>
                데모 상태 변경
                <select value={selected.status} onChange={(e) => actions.setStatus(selected.id, e.target.value as UnitStatus)}>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <p className={styles.muted}>상태 변경은 이 화면에서만 적용되는 데모 동작이며 3D·목록에 즉시 반영됩니다.</p>
        </section>

        <section className={styles.group} aria-labelledby="reue-compare-title">
          <h3 id="reue-compare-title">호실 비교 ({compare.length}/2)</h3>
          {compare.length === 0 ? (
            <p className={styles.muted}>호실을 선택한 뒤 &quot;비교에 담기&quot;로 최대 2개를 비교합니다.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>선택한 호실 비교표</caption>
                <thead>
                  <tr>
                    <th scope="col">항목</th>
                    {compare.map((u) => (
                      <th scope="col" key={u.id}>
                        {unitLabel(u)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["상태", (u: UnitRecord) => STATUS_META[u.status].label],
                      ["향", (u: UnitRecord) => `${u.facing}향`],
                      ["전용면적", (u: UnitRecord) => `${u.exclusiveArea}㎡`],
                      ["공급면적", (u: UnitRecord) => `${u.supplyArea}㎡`],
                      ["호가 (데모)", (u: UnitRecord) => formatPrice(u.priceMan)],
                      ["관리비 (데모)", (u: UnitRecord) => `월 ${u.maintenanceFeeMan}만원`],
                    ] as const
                  ).map(([label, fn]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {compare.map((u) => (
                        <td key={u.id}>{fn(u)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">빼기</th>
                    {compare.map((u) => (
                      <td key={u.id}>
                        <button type="button" className="btn-ghost" onClick={() => actions.toggleCompare(u.id)}>
                          {u.ho}호 빼기
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <InquiryForm formRef={formRef} units={units} selected={selected} onSelect={actions.select} />

      <details className={styles.details}>
        <summary>조작 안내 · 성능 · 모델 교체</summary>
        <ul className={styles.help}>
          <li>마우스: 드래그 회전, 호실 클릭 선택(드래그는 선택 아님). 휠 줌은 끔. 터치: 가로 드래그 회전, 세로는 페이지 스크롤.</li>
          <li>키보드: 위 층·호실 버튼으로 모든 선택 가능. ESC로 요약 닫기, Tab으로 이동.</li>
          <li>품질: {state.tier} (자동 조절) · 추정 FPS {fps || "측정 중"} · 보이지 않을 때는 렌더를 멈춥니다.</li>
          <li>모델 교체 체크리스트:</li>
        </ul>
        <ol className={styles.help}>
          {ASSET_CHECKLIST.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </details>
    </section>
  );
}

// ───────── 문의 폼 (데모: 전송·저장 없음) ─────────
type Errors = Partial<Record<"name" | "phone" | "unit" | "consent", string>>;

function InquiryForm({ formRef, units, selected, onSelect }: { formRef: RefObject<HTMLElement | null>; units: UnitRecord[]; selected: UnitRecord | null; onSelect(id: string | null): void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) successRef.current?.focus();
  }, [done]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "이름을 입력해 주세요.";
    if (!PHONE_RE.test(phone.trim())) next.phone = "연락처를 010-1234-5678 형식으로 입력해 주세요.";
    if (!selected) next.unit = "문의할 호실을 선택해 주세요.";
    else if (selected.status === "sold") next.unit = "분양 완료 호실은 문의 대상이 아닙니다(데모 규칙). 다른 호실을 선택해 주세요.";
    if (!consent) next.consent = "문의 접수를 위한 동의가 필요합니다.";
    setErrors(next);
    const firstBad = next.name ? nameRef : next.phone ? phoneRef : next.unit ? unitRef : next.consent ? consentRef : null;
    if (firstBad) return firstBad.current?.focus();
    track("lead_submit", { unit: selected!.id, floor: selected!.floor }); // 개인정보 제외
    setDone(unitLabel(selected!));
  }

  function again() {
    setName("");
    setPhone("");
    setMessage("");
    setConsent(false);
    setErrors({});
    setDone(null);
  }

  return (
    <section ref={formRef} id="reue-inquiry" tabIndex={-1} className={styles.inquiry} aria-labelledby="reue-inquiry-title">
      <h3 id="reue-inquiry-title">관심 호실 문의 <span className={styles.demoTag}>DEMO</span></h3>
      <p className={styles.muted}>데모 폼입니다. 입력값은 서버로 전송되거나 어디에도 저장되지 않습니다. 실제 서비스에서는 최소 수집·동의·보관 기간 안내가 필요합니다.</p>
      {done ? (
        <div ref={successRef} tabIndex={-1} className={styles.success} role="status">
          <strong>데모 접수 완료</strong>
          <p>{done} 문의가 접수된 것으로 표시했습니다. 실제로 전송된 내용은 없습니다.</p>
          <button type="button" className="btn-ghost" onClick={again}>
            새 문의 작성
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className={styles.form}>
          {Object.keys(errors).length > 0 && (
            <p className={styles.errorSummary} role="alert">
              입력 내용을 확인해 주세요: {Object.values(errors).join(" ")}
            </p>
          )}
          <label>
            문의 호실 (선택과 연동)
            <select ref={unitRef} value={selected?.id ?? ""} onChange={(e) => onSelect(e.target.value || null)} aria-invalid={!!errors.unit} aria-describedby={errors.unit ? "reue-err-unit" : undefined}>
              <option value="">호실을 선택하세요</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {unitLabel(u)} · {STATUS_META[u.status].label}
                </option>
              ))}
            </select>
            {errors.unit && <span id="reue-err-unit" className={styles.err}>{errors.unit}</span>}
          </label>
          <label>
            이름
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? "reue-err-name" : undefined} />
            {errors.name && <span id="reue-err-name" className={styles.err}>{errors.name}</span>}
          </label>
          <label>
            연락처
            <input ref={phoneRef} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "reue-err-phone" : undefined} />
            {errors.phone && <span id="reue-err-phone" className={styles.err}>{errors.phone}</span>}
          </label>
          <label>
            문의 내용 (선택)
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </label>
          <label className={styles.check}>
            <input ref={consentRef} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "reue-err-consent" : undefined} />
            <span>데모 문의 접수를 위한 정보 입력에 동의합니다 (저장되지 않음).</span>
          </label>
          {errors.consent && <span id="reue-err-consent" className={styles.err}>{errors.consent}</span>}
          <button type="submit" className="btn-primary">
            {selected ? `${selected.ho}호 문의 보내기 (데모)` : "문의 보내기 (데모)"}
          </button>
        </form>
      )}
    </section>
  );
}
