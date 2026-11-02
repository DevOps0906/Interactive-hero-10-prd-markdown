"use client";

import { useRef, useState, type FormEvent } from "react";
import { LEVELS, getLesson, mockData, type LevelId } from "./config";
import { track } from "./useLab";
import styles from "./RobotLearningLab.module.css";

type Errors = Partial<Record<"name" | "contact" | "consent", string>>;
const PHONE = /^[0-9+\-\s()]{9,16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 체험 수업 신청 데모 폼. 전송·저장하지 않고 검증 후 확인 상태만 보여준다(개인정보 없음). */
export default function TrialForm({ level, onLevel }: { level: LevelId; onLevel: (l: LevelId) => void }) {
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<LevelId | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  const lesson = getLesson(level);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = nameRef.current?.value.trim() ?? "";
    const contact = contactRef.current?.value.trim() ?? "";
    const next: Errors = {};
    if (name.length < 2) next.name = "보호자 성함을 2자 이상 입력해 주세요.";
    if (!PHONE.test(contact) && !EMAIL.test(contact)) next.contact = "연락처(전화번호 또는 이메일) 형식을 확인해 주세요.";
    if (!consentRef.current?.checked) next.consent = "데모 안내 확인에 체크해 주세요.";
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.contact) return contactRef.current?.focus();
    if (next.consent) return consentRef.current?.focus();
    track("lead_submit", { level });
    form.reset();
    setDone(level);
  }

  return (
    <section className={styles.trial} id="trial-form" aria-labelledby="trial-title" tabIndex={-1}>
      <h3 id="trial-title">체험 수업 신청 <span className={styles.demoTag}>{mockData.label}</span></h3>
      <p className={styles.muted}>선택한 학습 레벨이 자동으로 반영돼요. 이 폼은 데모라서 입력한 내용은 전송·저장되지 않아요.</p>
      {done ? (
        <p className={styles.confirm} role="status">
          신청이 접수된 것처럼 표시했어요 (데모). 선택 레벨: {LEVELS.find((l) => l.id === done)?.label}. 실제 서비스에서는 상담 일정 안내가 이어집니다.
        </p>
      ) : null}
      <form noValidate onSubmit={submit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="trial-name">보호자 성함</label>
          <input id="trial-name" ref={nameRef} autoComplete="off" aria-invalid={!!errors.name} aria-describedby={errors.name ? "trial-name-err" : undefined} />
          {errors.name ? <span id="trial-name-err" className={styles.err} role="alert">{errors.name}</span> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="trial-contact">연락처 (데모: 아무 값이나 형식만 맞춰 주세요)</label>
          <input id="trial-contact" ref={contactRef} autoComplete="off" inputMode="text" aria-invalid={!!errors.contact} aria-describedby={errors.contact ? "trial-contact-err" : undefined} />
          {errors.contact ? <span id="trial-contact-err" className={styles.err} role="alert">{errors.contact}</span> : null}
        </div>
        <div className={styles.field}>
          <label htmlFor="trial-level">학습 레벨</label>
          <select id="trial-level" value={level} onChange={(e) => onLevel(e.target.value as LevelId)}>
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
          <span className={styles.muted}>{lesson.title} · {lesson.weeks}주 · 회당 {lesson.minutes}분 · {lesson.priceLabel}</span>
        </div>
        <div className={styles.field}>
          <label className={styles.check}>
            <input type="checkbox" ref={consentRef} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? "trial-consent-err" : undefined} />
            <span>데모이며 입력 정보가 저장·전송되지 않음을 확인했어요.</span>
          </label>
          {errors.consent ? <span id="trial-consent-err" className={styles.err} role="alert">{errors.consent}</span> : null}
        </div>
        <button type="submit" className="btn-primary">체험 수업 신청하기 ({LEVELS.find((l) => l.id === level)?.label})</button>
      </form>
    </section>
  );
}
