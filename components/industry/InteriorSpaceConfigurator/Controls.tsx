"use client";

import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { DAYLIGHTS, FURNITURE, FURNITURE_BY_ID, MATERIALS, ROOM, STORAGE_KEY, SURFACE_LABEL, VIEWPOINTS, mockPricing, ASSET_CHECKLIST } from "./config";
import { computeEstimate, configId, findOverlaps, materialOf, parseScene, placedItemNames, serializeScene, track, won } from "./logic";
import type { Actions, State } from "./useConfigurator";
import type { FurnitureId, SurfaceId } from "./types";
import styles from "./InteriorSpaceConfigurator.module.css";

interface ControlsProps {
  state: State;
  actions: Actions;
  reduced: boolean;
}

/** 앵커 이동 + 대상 제목으로 포커스 이동 */
export function goTo(id: string, reduced: boolean) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

const isFurniture = (id: string | null): id is FurnitureId => id !== null && id in FURNITURE_BY_ID;
const isSurface = (id: string | null): id is SurfaceId => id === "floor" || id === "wall" || id === "ceiling";

// ───────── 시점 ─────────
function ViewCard({ state, actions }: Pick<ControlsProps, "state" | "actions">) {
  const walking = state.viewMode === "walk";
  return (
    <section className={styles.card} aria-labelledby="ic-view-h">
      <h2 id="ic-view-h">시점</h2>
      <div className={styles.row} role="group" aria-label="시점 모드">
        <button type="button" className={styles.chip} aria-pressed={!walking} onClick={() => actions.setView("orbit")}>방 전체</button>
        <button type="button" className={styles.chip} aria-pressed={walking} onClick={() => actions.setView("walk", state.viewIndex)}>걸어서 보기</button>
      </div>
      <div className={styles.row} role="group" aria-label="걷기 위치" data-off={!walking || undefined}>
        {VIEWPOINTS.map((v, i) => (
          <button key={v.id} type="button" className={styles.chip} aria-pressed={walking && state.viewIndex === i} disabled={!walking} onClick={() => actions.setView("walk", i)}>
            {v.label}
          </button>
        ))}
        <button type="button" className={styles.chip} disabled={!walking} onClick={() => actions.lookAround(-1)} aria-label="왼쪽으로 둘러보기">◀ 좌</button>
        <button type="button" className={styles.chip} disabled={!walking} onClick={() => actions.lookAround(1)} aria-label="오른쪽으로 둘러보기">우 ▶</button>
      </div>
      <p className={styles.note}>
        현재 시점: <strong>{walking ? `걷기 · ${VIEWPOINTS[state.viewIndex].label}` : "방 전체 둘러보기"}</strong>
        {state.isAnimating ? " (이동 중)" : ""}. 천장은 걷기 시점에서 보입니다.
      </p>
    </section>
  );
}

// ───────── 소재 ─────────
function MaterialsCard({ state, actions }: Pick<ControlsProps, "state" | "actions">) {
  const uid = useId();
  return (
    <section className={styles.card} aria-labelledby="ic-mat-h">
      <h2 id="ic-mat-h">표면 소재</h2>
      {(Object.keys(MATERIALS) as SurfaceId[]).map((s) => (
        <fieldset key={s} className={styles.fieldset}>
          <legend>{SURFACE_LABEL[s]}: <strong>{materialOf(s, state.config[s]).label}</strong></legend>
          <div className={styles.swatches}>
            {MATERIALS[s].map((m) => (
              <label key={m.id} className={styles.swatch} data-checked={state.config[s] === m.id || undefined}>
                <input type="radio" name={`${uid}-${s}`} checked={state.config[s] === m.id} onChange={() => actions.setMaterial(s, m.id)} />
                <span className={styles.dot} style={{ background: m.color }} aria-hidden="true" />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </section>
  );
}

// ───────── 가구 ─────────
function FurnitureCard({ state, actions, overlaps }: Pick<ControlsProps, "state" | "actions"> & { overlaps: Set<FurnitureId> }) {
  const sel = isFurniture(state.selectedId) ? state.selectedId : null;
  const selItem = sel ? state.config.items[sel] : null;
  const onPadKey = (e: KeyboardEvent) => {
    if (!sel) return;
    const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const v = d[e.key];
    if (v) {
      e.preventDefault();
      actions.nudge(sel, v[0], v[1]);
    }
  };
  return (
    <section className={styles.card} aria-labelledby="ic-furn-h">
      <h2 id="ic-furn-h">가구 배치</h2>
      <ul className={styles.list}>
        {FURNITURE.map((f) => {
          const it = state.config.items[f.id];
          return (
            <li key={f.id} className={styles.item} data-selected={state.selectedId === f.id || undefined}>
              <div className={styles.itemMain}>
                <strong>{f.name}</strong>
                <span className={styles.meta}>
                  {Math.round(f.w * 1000)}×{Math.round(f.d * 1000)}×{Math.round(f.h * 1000)}mm · {won(f.price)}
                </span>
                <span className={styles.meta}>
                  {it.placed ? `배치됨 (x ${it.x.toFixed(1)}, z ${it.z.toFixed(1)} m)` : "미배치"}
                  {overlaps.has(f.id) && <b className={styles.warn}> · 겹침 경고</b>}
                </span>
              </div>
              <div className={styles.row}>
                <button type="button" className={styles.chip} aria-pressed={it.placed} onClick={() => actions.toggleItem(f.id)}>{it.placed ? "제거" : "배치"}</button>
                <button type="button" className={styles.chip} aria-pressed={state.selectedId === f.id} disabled={!it.placed} onClick={() => actions.select(state.selectedId === f.id ? null : f.id)}>
                  {state.selectedId === f.id ? "선택됨" : "선택"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className={styles.pad} role="group" aria-label={sel ? `${FURNITURE_BY_ID[sel].name} 이동` : "가구 이동 (가구를 먼저 선택하세요)"} onKeyDown={onPadKey} data-off={!sel || undefined}>
        <button type="button" className={styles.chip} disabled={!sel} onClick={() => sel && actions.nudge(sel, 0, -1)} aria-label="뒤로(위) 10cm">▲</button>
        <div className={styles.padRow}>
          <button type="button" className={styles.chip} disabled={!sel} onClick={() => sel && actions.nudge(sel, -1, 0)} aria-label="왼쪽 10cm">◀</button>
          <button type="button" className={styles.chip} disabled={!sel} onClick={() => sel && actions.nudge(sel, 0, 1)} aria-label="앞으로(아래) 10cm">▼</button>
          <button type="button" className={styles.chip} disabled={!sel} onClick={() => sel && actions.nudge(sel, 1, 0)} aria-label="오른쪽 10cm">▶</button>
        </div>
        <button type="button" className={styles.chip} disabled={!sel} onClick={() => sel && actions.rotate(sel)}>90° 회전{selItem?.rot === 1 ? " (적용 중)" : ""}</button>
      </div>
      <p className={styles.note}>가구를 선택한 뒤 3D 바닥을 클릭하거나 화살표 버튼·키로 10cm씩 이동합니다. 겹침은 단순 영역 검사이며 통행 폭·소방 이격은 검증하지 않습니다.</p>
    </section>
  );
}

// ───────── 채광 + 치수 ─────────
function LightDimsCard({ state, actions }: Pick<ControlsProps, "state" | "actions">) {
  const sel = isFurniture(state.selectedId) ? FURNITURE_BY_ID[state.selectedId] : null;
  const day = DAYLIGHTS.find((d) => d.id === state.config.daylight)!;
  return (
    <section className={styles.card} aria-labelledby="ic-light-h">
      <h2 id="ic-light-h">채광 · 치수</h2>
      <div className={styles.row} role="group" aria-label="채광 프리셋">
        {DAYLIGHTS.map((d) => (
          <button key={d.id} type="button" className={styles.chip} aria-pressed={state.config.daylight === d.id} onClick={() => actions.setDaylight(d.id)}>{d.label}</button>
        ))}
      </div>
      <p className={styles.note}>채광: <strong>{day.label}</strong> · {day.note}. 장면 연출용이며 실제 일조량 분석이 아닙니다.</p>
      <div className={styles.row}>
        <button type="button" className={styles.chip} aria-pressed={state.showDims} onClick={actions.toggleDims}>치수 표시 {state.showDims ? "켜짐" : "꺼짐"}</button>
      </div>
      <dl className={styles.dl}>
        <dt>방 치수 (데모)</dt>
        <dd>가로 {ROOM.w}m × 세로 {ROOM.d}m × 높이 {ROOM.h}m</dd>
        {sel && (
          <>
            <dt>{sel.name} 규격</dt>
            <dd>{Math.round(sel.w * 1000)}×{Math.round(sel.d * 1000)}×{Math.round(sel.h * 1000)}mm</dd>
          </>
        )}
      </dl>
      <p className={styles.note}>치수는 참고용입니다. 현장 실측으로 검증하기 전에는 시공·구매 근거로 쓰지 마세요.</p>
    </section>
  );
}

// ───────── 선택 상태 ─────────
function SelectionCard({ state, overlaps }: { state: State; overlaps: Set<FurnitureId> }) {
  const id = state.selectedId;
  let body: string;
  if (isSurface(id)) {
    const m = materialOf(id, state.config[id]);
    body = `${SURFACE_LABEL[id]} · ${m.label} (재질 슬롯 ${m.slot}, 기준 ${won(m.pricePerM2)}/㎡)`;
  } else if (isFurniture(id)) {
    const f = FURNITURE_BY_ID[id];
    const it = state.config.items[id];
    body = `${f.name} · x ${it.x.toFixed(1)} m, z ${it.z.toFixed(1)} m${it.rot ? ", 90° 회전" : ""}${overlaps.has(id) ? " · 다른 가구와 겹침" : ""}`;
  } else body = "선택 없음. 소재 스와치나 가구의 [선택]을 눌러 보세요.";
  return (
    <section className={styles.card} aria-labelledby="ic-sel-h">
      <h2 id="ic-sel-h">선택 상태</h2>
      <p className={styles.selected} data-warn={(isFurniture(id) && overlaps.has(id)) || undefined}>{body}</p>
      <p className={styles.live} role="status" aria-live="polite">{state.status || " "}</p>
      <p className={styles.note}>Esc 키로 선택을 해제합니다.</p>
    </section>
  );
}

// ───────── 견적 + 저장 ─────────
function EstimateCard({ state, actions, id }: Pick<ControlsProps, "state" | "actions"> & { id: string }) {
  const est = useMemo(() => computeEstimate(state.config, mockPricing), [state.config]);
  const json = useMemo(() => serializeScene(state.config), [state.config]);
  const [msg, setMsg] = useState("");
  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, json);
      setMsg(`구성 ${id}을(를) 이 브라우저에 저장했습니다.`);
    } catch {
      setMsg("저장할 수 없습니다. 브라우저 저장소가 차단되어 있습니다.");
    }
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return setMsg("저장된 구성이 없습니다.");
      const cfg = parseScene(raw);
      if (!cfg) return setMsg("저장된 구성이 올바르지 않아 불러오지 못했습니다.");
      actions.load(cfg);
      setMsg("저장된 구성을 불러왔습니다.");
    } catch {
      setMsg("불러올 수 없습니다. 브라우저 저장소가 차단되어 있습니다.");
    }
  };
  return (
    <section className={styles.card} aria-labelledby="ic-est-h">
      <h2 id="ic-est-h">견적 요약 <span className={styles.badge}>{est.source}</span></h2>
      <p className={styles.note}>구성 ID <code>{id}</code></p>
      <table className={styles.table}>
        <caption className="sr-only">선택 품목 기준 단가 (데모)</caption>
        <tbody>
          {est.lines.map((l) => (
            <tr key={l.key}>
              <th scope="row">{l.label}<small>{l.detail}</small></th>
              <td>{won(l.amount)}</td>
            </tr>
          ))}
          <tr className={styles.sum}><th scope="row">기준 단가 합계</th><td>{won(est.base)}</td></tr>
          {est.extras.map((l) => (
            <tr key={l.key} className={styles.extra}>
              <th scope="row">{l.label}<small>{l.detail}</small></th>
              <td>{won(l.amount)}</td>
            </tr>
          ))}
          <tr className={styles.sum}><th scope="row">참고 총액</th><td>{won(est.total)}</td></tr>
        </tbody>
      </table>
      <p className={styles.note}>데모 예시 단가입니다. 설치·배송·시공비는 별도 변수이며, 실제 계약 견적과 다릅니다.</p>
      <div className={styles.row}>
        <button type="button" className={styles.chip} onClick={save}>구성 저장</button>
        <button type="button" className={styles.chip} onClick={load}>불러오기</button>
      </div>
      <p className={styles.live} role="status" aria-live="polite">{msg || " "}</p>
      <details className={styles.details}>
        <summary>구성 JSON 보기</summary>
        <textarea readOnly rows={4} value={json} aria-label="현재 구성 JSON" />
      </details>
    </section>
  );
}

// ───────── 견적 요청 폼 (데모: 전송·저장하지 않음) ─────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type FormErrors = Partial<Record<"name" | "contact" | "consent", string>>;

function QuoteForm({ state, id, reduced }: { state: State; id: string; reduced: boolean }) {
  const [errors, setErrors] = useState<FormErrors>({});
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const items = placedItemNames(state.config);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const contact = String(fd.get("contact") ?? "").trim();
    const next: FormErrors = {};
    if (name.length < 2) next.name = "이름을 2자 이상 입력하세요.";
    if (!EMAIL_RE.test(contact) && contact.replace(/\D/g, "").length < 9) next.contact = "이메일 또는 전화번호(숫자 9자리 이상)를 입력하세요.";
    if (fd.get("consent") !== "on") next.consent = "상담 연락 목적의 수집·이용에 동의해야 요청할 수 있습니다.";
    setErrors(next);
    const first = (["name", "contact", "consent"] as const).find((k) => next[k]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    // 데모: 서버 전송·저장 없음. 측정 이벤트에는 개인정보를 넣지 않는다.
    track("lead_submit", { configId: id, itemCount: items.length });
    setSent(true);
    window.setTimeout(() => goTo("ic-quote-done", reduced), 0);
  };

  return (
    <section className={styles.card} id="ic-quote" aria-labelledby="ic-quote-title">
      <h2 id="ic-quote-title" tabIndex={-1}>견적 요청 <span className={styles.badge}>데모</span></h2>
      {sent ? (
        <div id="ic-quote-done" tabIndex={-1} className={styles.done} role="status">
          <strong>요청 내용을 확인했습니다. (데모)</strong>
          <p>실제로 전송되거나 저장되지 않았습니다. 구성 ID {id}, 품목 {items.length}개: {items.join(", ") || "없음"}.</p>
          <button type="button" className={styles.chip} onClick={() => setSent(false)}>다시 작성</button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={submit} noValidate>
          <p className={styles.note}>구성 ID <code>{id}</code> · 품목 {items.length}개: {items.join(", ") || "없음"}</p>
          <label className={styles.field}>
            <span>이름</span>
            <input name="name" autoComplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? "ic-e-name" : undefined} />
            {errors.name && <em id="ic-e-name" role="alert">{errors.name}</em>}
          </label>
          <label className={styles.field}>
            <span>이메일 또는 전화번호</span>
            <input name="contact" autoComplete="off" aria-invalid={!!errors.contact} aria-describedby={errors.contact ? "ic-e-contact" : undefined} />
            {errors.contact && <em id="ic-e-contact" role="alert">{errors.contact}</em>}
          </label>
          <label className={styles.field}>
            <span>요청 메모 (선택)</span>
            <textarea name="memo" rows={3} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="consent" aria-invalid={!!errors.consent} aria-describedby="ic-e-consent" />
            <span>상담 연락을 위한 최소 정보(이름·연락처) 수집·이용에 동의합니다. 데모에서는 저장하지 않습니다.</span>
          </label>
          {errors.consent && <em id="ic-e-consent" className={styles.err} role="alert">{errors.consent}</em>}
          <button type="submit" className={`btn-primary ${styles.submit}`}>견적 요청 (데모)</button>
        </form>
      )}
    </section>
  );
}

// ───────── 모바일 바텀시트 (≤767) ─────────
export function BottomSheet({ state, reduced }: { state: State; reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const est = useMemo(() => computeEstimate(state.config, mockPricing), [state.config]);
  const id = configId(state.config);
  return (
    <div className={styles.sheet} data-open={open || undefined}>
      <div className={styles.sheetBar}>
        <button type="button" className={styles.chip} aria-expanded={open} aria-controls="ic-sheet-body" onClick={() => setOpen(!open)}>
          {open ? "접기" : "구성 요약"}
        </button>
        <span className={styles.sheetTotal}>기준 {won(est.base)}<small> (데모)</small></span>
        <button
          type="button"
          className={`btn-primary ${styles.sheetCta}`}
          onClick={() => {
            track("hero_cta_click", { cta: "sheet_quote", configId: id });
            goTo("ic-quote-title", reduced);
          }}
        >
          견적 요청
        </button>
      </div>
      <div id="ic-sheet-body" className={styles.sheetBody} hidden={!open}>
        <p className={styles.note}>구성 ID <code>{id}</code></p>
        <ul>
          {est.lines.map((l) => (
            <li key={l.key}>{l.label} — {won(l.amount)}</li>
          ))}
        </ul>
        <p className={styles.note}>설치·배송·시공비 별도(데모 변수 {won(est.extrasTotal)}).</p>
      </div>
    </div>
  );
}

export default function Controls({ state, actions, reduced }: ControlsProps) {
  const overlaps = useMemo(() => findOverlaps(state.config), [state.config]);
  const id = useMemo(() => configId(state.config), [state.config]);
  return (
    <div
      className={styles.panel}
      id="ic-panel"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape" && state.selectedId) actions.select(null);
      }}
    >
      <div className={styles.grid}>
        <ViewCard state={state} actions={actions} />
        <MaterialsCard state={state} actions={actions} />
        <FurnitureCard state={state} actions={actions} overlaps={overlaps} />
        <LightDimsCard state={state} actions={actions} />
        <SelectionCard state={state} overlaps={overlaps} />
        <EstimateCard state={state} actions={actions} id={id} />
        <QuoteForm state={state} id={id} reduced={reduced} />
      </div>
      <details className={styles.assets}>
        <summary>모델 교체 체크리스트 (개발자용)</summary>
        <ul>
          {ASSET_CHECKLIST.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
