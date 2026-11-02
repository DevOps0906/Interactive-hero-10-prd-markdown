"use client";

import { useRef, type KeyboardEvent } from "react";
import { JOINT_BY_ID, LEVELS, getLesson, mockData } from "./config";
import { track, type LabActions, type LabState } from "./useLab";
import type { Pose } from "./config";
import styles from "./RobotLearningLab.module.css";

/** 폼으로 이동하고 첫 입력에 포커스. */
export function goTrial(reduced: boolean) {
  const form = document.getElementById("trial-form");
  if (!form) return;
  form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  document.getElementById("trial-name")?.focus({ preventScroll: true });
}

/** 스테이지 위 요약·전환 카드. 모바일(~767)은 바텀시트(토글), 768~는 하단 카드. */
export default function Summary({ state, pose, actions }: { state: LabState; pose: Pose; actions: LabActions }) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { level, selectedId, sheetOpen, reduced } = state;
  const levelLabel = LEVELS.find((l) => l.id === level)?.label ?? "";
  const lesson = getLesson(level);
  const joint = selectedId ? JOINT_BY_ID[selectedId] : null;

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape" && sheetOpen) {
      actions.setSheet(false);
      toggleRef.current?.focus();
    }
  }

  return (
    <div className={styles.sheet} data-open={sheetOpen} onKeyDown={onKey}>
      <button ref={toggleRef} type="button" className={styles.sheetToggle} aria-expanded={sheetOpen} aria-controls="lab-sheet-body" onClick={() => actions.setSheet()}>
        {joint ? `선택: ${joint.label}` : "선택 요약"} · {levelLabel} {sheetOpen ? "▾" : "▴"}
      </button>
      <div id="lab-sheet-body" className={styles.sheetBody} role="region" aria-label="선택 요약과 체험 신청">
        <p className={styles.sheetLine}>
          <strong>{joint ? joint.label : "관절을 선택해 보세요"}</strong>
          {joint ? ` · 현재 ${Math.round(pose[joint.id])}${joint.unit}` : ""}
        </p>
        <p className={styles.sheetLine}>
          학습 레벨 <strong>{levelLabel}</strong> · {lesson.title} <span className={styles.demoTag}>{mockData.label}</span>
        </p>
        <a
          className={`btn-primary ${styles.ctaLink}`}
          href="#trial-form"
          onClick={(e) => {
            e.preventDefault();
            track("hero_cta_click", { where: "summary", level });
            actions.setSheet(false);
            goTrial(reduced);
          }}
        >
          {levelLabel} 체험 수업 신청
        </a>
      </div>
    </div>
  );
}
