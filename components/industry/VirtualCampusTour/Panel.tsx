"use client";

import { useRef, useState, type FormEvent } from "react";
import { DEMO_LABEL, track, type CampusData, type ProgramId, type SpaceId } from "./config";
import type { TourActions, TourState } from "./useCampusTour";
import styles from "./VirtualCampusTour.module.css";

interface PanelProps {
  data: CampusData;
  state: TourState;
  actions: TourActions;
}

type Errors = Partial<Record<"space" | "date" | "people" | "consent", string>>;
const MAX_DAYS = 90;
const MAX_PEOPLE = 10;

function validate(f: { space: string; date: string; people: string; consent: boolean }): Errors {
  const e: Errors = {};
  if (!f.space) e.space = "방문할 공간을 선택해 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) e.date = "방문 날짜를 입력해 주세요.";
  else {
    const [y, m, d] = f.date.split("-").map(Number);
    const picked = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + MAX_DAYS);
    if (Number.isNaN(picked.getTime()) || picked.getMonth() !== m - 1) e.date = "올바른 날짜가 아닙니다.";
    else if (picked < today) e.date = "오늘 이후 날짜를 선택해 주세요.";
    else if (picked > limit) e.date = `${MAX_DAYS}일 이내 날짜만 예약할 수 있습니다.`;
  }
  const n = Number(f.people);
  if (!f.people || !Number.isInteger(n) || n < 1 || n > MAX_PEOPLE) e.people = `인원은 1~${MAX_PEOPLE}명 정수로 입력해 주세요.`;
  if (!f.consent) e.consent = "데모 안내 확인에 동의해 주세요.";
  return e;
}

export default function Panel({ data, state, actions }: PanelProps) {
  const { selectedId, journeyIndex, compare } = state;
  const [programId, setProgramId] = useState<ProgramId | "">("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState("1");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ space: string; program: string; date: string; people: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const spaceName = (id: string) => data.spaces.find((s) => s.id === id)?.name ?? "";
  const programName = (id: string) => data.programs.find((p) => p.id === id)?.name ?? "미선택";
  const programOf = (id: ProgramId) => data.programs.find((p) => p.id === id)!;
  const [pa, pb] = [programOf(compare[0]), programOf(compare[1])];

  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setDone(null);
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const found = validate({ space: selectedId ?? "", date, people, consent });
    setErrors(found);
    if (Object.keys(found).length) {
      const first = (["space", "date", "people", "consent"] as const).find((k) => found[k]);
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      setDone(null);
      return;
    }
    // 데모: 서버 전송·저장 없음. 측정 이벤트에는 개인정보를 넣지 않는다.
    track("lead_submit", { space: selectedId ?? "", program: programId, people: Number(people) });
    setDone({ space: spaceName(selectedId ?? ""), program: programName(programId), date, people });
  };

  const bookProgram = (id: ProgramId) => {
    setProgramId(id);
    setDone(null);
    track("hero_cta_click", { cta: "visit_booking", from: "compare" });
    const p = programOf(id);
    if (!selectedId || !p.spaceIds.includes(selectedId)) actions.select(p.spaceIds[0]);
    document.getElementById("campus-booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cur = journeyIndex >= 0 ? data.journey[journeyIndex] : null;

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2>공간·과정 둘러보기</h2>
        <span className={styles.demo}>{DEMO_LABEL}</span>
      </div>

      <div className={styles.grid}>
        <section className={styles.block} aria-labelledby="vc-spaces">
          <h3 id="vc-spaces">공간 선택</h3>
          <div className={styles.row}>
            {data.spaces.map((s) => (
              <button key={s.id} type="button" className={styles.pick} aria-pressed={selectedId === s.id} onClick={() => actions.select(s.id)}>
                {s.name}
                <span className={styles.srOnly}>{selectedId === s.id ? " (선택됨)" : ""}</span>
              </button>
            ))}
          </div>
          <p className={styles.muted} aria-live="polite">{selectedId ? `선택됨: ${spaceName(selectedId)}` : "선택된 공간 없음(캠퍼스 전경)"}</p>
        </section>

        <section className={styles.block} aria-labelledby="vc-journey">
          <h3 id="vc-journey">학생 여정</h3>
          <ol className={styles.steps}>
            {data.journey.map((j, i) => (
              <li key={j.id}>
                <button type="button" className={styles.pick} aria-current={journeyIndex === i ? "step" : undefined} aria-pressed={journeyIndex === i} onClick={() => actions.journeyGo(i)}>
                  {i + 1}. {j.label}
                </button>
              </li>
            ))}
          </ol>
          <p className={styles.muted} aria-live="polite">{cur ? `${cur.label} · ${spaceName(cur.spaceId)} — ${cur.text}` : "단계를 선택하면 카메라가 해당 공간으로 이동합니다."}</p>
          <div className={styles.row}>
            <button type="button" className="btn-ghost" disabled={journeyIndex <= 0} onClick={() => actions.journeyGo(journeyIndex - 1)}>이전 단계</button>
            <button type="button" className="btn-ghost" disabled={journeyIndex >= data.journey.length - 1} onClick={() => actions.journeyGo(journeyIndex + 1)}>
              {journeyIndex < 0 ? "여정 시작" : "다음 단계"}
            </button>
          </div>
        </section>

        <section className={`${styles.block} ${styles.wide}`} aria-labelledby="vc-compare">
          <h3 id="vc-compare">과정 비교 <span className={styles.demo}>{DEMO_LABEL}</span></h3>
          <div className={styles.row}>
            {([0, 1] as const).map((slot) => (
              <label key={slot} className={styles.field}>
                <span>과정 {slot === 0 ? "A" : "B"}</span>
                <select value={compare[slot]} onChange={(e) => actions.setCompare(slot, e.target.value as ProgramId)}>
                  {data.programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className={styles.tableWrap}>
            <table>
              <caption className={styles.srOnly}>선택한 두 과정 비교</caption>
              <thead>
                <tr><th scope="col">항목</th><th scope="col">{pa.name}</th><th scope="col">{pb.name}</th></tr>
              </thead>
              <tbody>
                <tr><th scope="row">교육 시간</th><td>{pa.hours}</td><td>{pb.hours}</td></tr>
                <tr><th scope="row">수강 대상</th><td>{pa.audience}</td><td>{pb.audience}</td></tr>
                <tr><th scope="row">장소</th><td>{pa.place}</td><td>{pb.place}</td></tr>
                <tr>
                  <th scope="row">예약</th>
                  {[pa, pb].map((p, i) => (
                    <td key={i}><button type="button" className="btn-ghost" onClick={() => bookProgram(p.id)}>이 과정으로 방문 예약</button></td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.block} ${styles.wide}`} id="campus-booking" aria-labelledby="vc-booking">
          <h3 id="vc-booking">시설 방문 예약 <span className={styles.demo}>데모 · 전송/저장되지 않음</span></h3>
          <form ref={formRef} onSubmit={submit} noValidate className={styles.form}>
            <label className={styles.field}>
              <span>방문 공간</span>
              <select name="space" value={selectedId ?? ""} onChange={(e) => edit(actions.select)(e.target.value ? (e.target.value as SpaceId) : null)} aria-invalid={!!errors.space} aria-describedby={errors.space ? "err-space" : undefined}>
                <option value="">공간 선택</option>
                {data.spaces.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.space && <em id="err-space" className={styles.err}>{errors.space}</em>}
            </label>
            <label className={styles.field}>
              <span>관심 과정(선택)</span>
              <select name="program" value={programId} onChange={(e) => edit(setProgramId)(e.target.value as ProgramId | "")}>
                <option value="">미선택</option>
                {data.programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>방문 날짜</span>
              <input id="booking-date" name="date" type="date" value={date} onChange={(e) => edit(setDate)(e.target.value)} aria-invalid={!!errors.date} aria-describedby={errors.date ? "err-date" : undefined} />
              {errors.date && <em id="err-date" className={styles.err}>{errors.date}</em>}
            </label>
            <label className={styles.field}>
              <span>방문 인원(1~{MAX_PEOPLE}명)</span>
              <input name="people" type="number" inputMode="numeric" min={1} max={MAX_PEOPLE} value={people} onChange={(e) => edit(setPeople)(e.target.value)} aria-invalid={!!errors.people} aria-describedby={errors.people ? "err-people" : undefined} />
              {errors.people && <em id="err-people" className={styles.err}>{errors.people}</em>}
            </label>
            <label className={`${styles.field} ${styles.check}`}>
              <input name="consent" type="checkbox" checked={consent} onChange={(e) => edit(setConsent)(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "err-consent" : undefined} />
              <span>데모입니다. 입력한 내용은 서버로 전송되거나 저장되지 않으며 이름·연락처는 받지 않습니다.</span>
              {errors.consent && <em id="err-consent" className={styles.err}>{errors.consent}</em>}
            </label>
            <div className={styles.row}>
              <button type="submit" className="btn-primary">방문 예약 요청(데모)</button>
            </div>
          </form>
          <div role="status" aria-live="polite" className={styles.status}>
            {done && (
              <p>
                예약 요청이 확인되었습니다(데모, 실제 접수되지 않음): {done.space} · {done.program} · {done.date} · {done.people}명
              </p>
            )}
          </div>
        </section>
      </div>

      <p className={styles.notice}>
        안내: 이 화면의 3D 공간은 설명용 단순 모형이며 실제 시설의 사진·구조와 다를 수 있습니다. 과정·시간표·수용 인원은 모두 데모 예시이고, 취업률·합격률 같은 성과 수치는 사용하지 않았습니다.
      </p>
    </div>
  );
}
