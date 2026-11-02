"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { DISCLAIMERS, PROCEDURE_BY_ID, TEETH_BY_ID, type DentalData, type ProcedureId } from "./config";
import { track } from "./useExplorer";
import styles from "./DentalProcedureExplorer.module.css";

interface Props {
  data: DentalData;
  procedureId: ProcedureId;
  toothId: string | null;
}

interface Errors {
  name?: string;
  phone?: string;
  consent?: string;
}

const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

/** 데모 예약 폼: 검증 후 확인 상태만 표시한다. 전송·저장 없음. 건강 정보는 받지 않는다(예약 정보와 분리). */
export default function Appointment({ data, procedureId, toothId }: Props) {
  const uid = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [typeOverride, setTypeOverride] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ label: string } | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  // 상담 유형 기본값은 선택한 진료 항목에서 파생(사용자가 바꾸면 우선)
  const defaultType = data.consultTypes.some((c) => c.id === procedureId) ? procedureId : "general";
  const consultType = typeOverride ?? defaultType;
  const consultLabel = data.consultTypes.find((c) => c.id === consultType)?.label ?? "일반 상담";
  // 예약 페이지로 넘기는 값: 항목·치아 번호·상담 유형만(의료 정보 아님)
  const handoff = `/reservation?item=${procedureId}&tooth=${toothId ?? "none"}&type=${consultType}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (name.trim().length < 2) next.name = "이름을 2자 이상 입력해 주세요.";
    if (!PHONE_RE.test(phone.trim())) next.phone = "연락처 형식을 확인해 주세요. 예: 010-0000-0000";
    if (!consent) next.consent = "개인정보 수집·이용에 동의해야 예약을 진행할 수 있습니다.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = next.name ? "name" : next.phone ? "phone" : "consent";
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    track("lead_submit", { consultType });
    setDone({ label: consultLabel });
    setName("");
    setPhone("");
    setConsent(false);
    requestAnimationFrame(() => doneRef.current?.focus());
  };

  if (done) {
    return (
      <div className={styles.done} ref={doneRef} tabIndex={-1} role="status">
        <p>
          <span className={styles.badge}>DEMO</span>
        </p>
        <p>
          <strong>{done.label}</strong> 예약 요청이 확인되었습니다(데모). 실제로 전송되거나 저장된 정보는 없습니다.
        </p>
        <button type="button" className={styles.btn} onClick={() => setDone(null)}>
          다시 작성
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <p className={styles.muted}>
        <span className={styles.badge}>DEMO</span> {DISCLAIMERS.privacy}
      </p>
      <div className={styles.field}>
        <label htmlFor={`${uid}-type`}>상담 유형</label>
        <select id={`${uid}-type`} value={consultType} onChange={(e) => setTypeOverride(e.target.value)}>
          {data.consultTypes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label htmlFor={`${uid}-name`}>이름</label>
        <input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? `${uid}-name-err` : undefined} />
        {errors.name && (
          <p className={styles.err} id={`${uid}-name-err`}>
            {errors.name}
          </p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${uid}-phone`}>연락처</label>
        <input id={`${uid}-phone`} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} aria-describedby={errors.phone ? `${uid}-phone-err` : undefined} />
        {errors.phone && (
          <p className={styles.err} id={`${uid}-phone-err`}>
            {errors.phone}
          </p>
        )}
      </div>
      <div className={styles.field}>
        <label className={styles.check}>
          <input id={`${uid}-consent`} type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? `${uid}-consent-err` : undefined} />
          <span>예약 안내를 위한 이름·연락처 수집·이용에 동의합니다(데모, 저장되지 않음).</span>
        </label>
        {errors.consent && (
          <p className={styles.err} id={`${uid}-consent-err`}>
            {errors.consent}
          </p>
        )}
      </div>
      <p className={styles.muted}>
        예약 페이지로 넘어가는 값(미리보기): <span className={styles.preview}>{handoff}</span>
        {toothId ? ` — ${TEETH_BY_ID[toothId].name}, ${PROCEDURE_BY_ID[procedureId].name}` : ""}
      </p>
      <div className={styles.row}>
        <button type="submit" className="btn-primary">
          상담 예약 요청(데모)
        </button>
      </div>
    </form>
  );
}
