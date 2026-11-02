"use client";

import { useId, type ReactNode } from "react";
import {
  JOINTS, JOINT_BY_ID, LEVELS, PARTS, PRESETS, VIEW_LABEL, isUnlocked, levelIndex,
  type LevelId, type ViewMode,
} from "./config";
import { IK_RANGE } from "./kinematics";
import type { useLab } from "./useLab";
import TrialForm from "./TrialForm";
import styles from "./RobotLearningLab.module.css";

type Lab = ReturnType<typeof useLab>;
export interface FullscreenCtl { supported: boolean; active: boolean; toggle: () => void }

const VIEW_ORDER: ViewMode[] = ["home", "front", "side", "top"];
const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l.label])) as Record<LevelId, string>;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={styles.group} aria-labelledby={id}>
      <h3 id={id}>{title}</h3>
      {hint ? <p className={styles.muted}>{hint}</p> : null}
      {children}
    </section>
  );
}

export default function Controls({ lab, fullscreen }: { lab: Lab; fullscreen: FullscreenCtl }) {
  const { state, actions, pose, ikInfo, safety } = lab;
  const { level, phase, running, ik, queue, activeIndex, selectedId, exploded, viewMode, presetId, history } = state;
  const ready = phase === "ready";
  const canQueueEdit = isUnlocked("intermediate", level) && ready && !running;
  const advanced = isUnlocked("advanced", level);
  const selectedModule = selectedId ? JOINT_BY_ID[selectedId] : null;

  return (
    <div className={styles.panel} id="lab-controls">
      <div className={styles.panelHead}>
        <h2>로봇 조작실</h2>
        <p className={styles.demoTag}>DEMO · 실제 로봇을 제어하지 않는 시뮬레이션이에요</p>
      </div>

      <div className={styles.toolbar} role="group" aria-label="공통 도구">
        <button type="button" className="btn-ghost" onClick={actions.undo} disabled={history.length === 0 || phase === "fallback"}>되돌리기</button>
        <button type="button" className="btn-ghost" onClick={actions.reset} disabled={!ready && !running}>초기화</button>
        <button type="button" className="btn-ghost" aria-pressed={exploded} onClick={actions.toggleExplode} disabled={phase === "fallback"}>
          부품 분해 {exploded ? "켜짐" : "꺼짐"}
        </button>
        <button type="button" className="btn-ghost" aria-pressed={fullscreen.active} onClick={fullscreen.toggle} disabled={!fullscreen.supported || phase === "fallback"}>
          전체화면 {fullscreen.active ? "켜짐" : "꺼짐"}
        </button>
        <div className={styles.views} role="group" aria-label="카메라 시점">
          {VIEW_ORDER.map((v) => (
            <button key={v} type="button" className={styles.chipBtn} aria-pressed={viewMode === v} onClick={() => actions.setView(v)} disabled={phase === "fallback"}>
              {VIEW_LABEL[v]}
            </button>
          ))}
          <span className={styles.muted}>시점: {VIEW_LABEL[viewMode]}</span>
        </div>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {state.notice || "관절 슬라이더나 프리셋으로 로봇을 움직여 보세요."}
        {safety.floor ? " · 주의: 손끝이 바닥에 가까워요(교육용 표시)." : ""}
        {safety.atLimit.length ? ` · 관절 한계: ${safety.atLimit.map((m) => JOINT_BY_ID[m].label.split(" ")[0]).join(", ")}` : ""}
      </p>

      <div className={styles.grid}>
        <Section title="학습 레벨" hint="레벨에 따라 조작할 수 있는 기능과 설명의 깊이가 달라져요.">
          <fieldset className={styles.levels}>
            <legend className={styles.srOnly}>학습 레벨 선택</legend>
            {LEVELS.map((l) => (
              <label key={l.id} className={styles.levelOpt} data-checked={level === l.id}>
                <input type="radio" name="lab-level" value={l.id} checked={level === l.id} onChange={() => actions.setLevel(l.id)} />
                <span>{l.label}</span>
              </label>
            ))}
          </fieldset>
          <p className={styles.muted}>
            {LEVELS[levelIndex(level)].summary} (열린 기능: {LEVELS[levelIndex(level)].unlocks})
          </p>
        </Section>

        <Section title="관절 조절" hint={running ? "명령 실행 중에는 슬라이더가 잠겨요." : ik.on ? "IK 목표점 모드에서는 목표 좌표가 관절각을 정해요." : undefined}>
          <div className={styles.joints}>
            {JOINTS.map((j) => {
              const locked = !isUnlocked(j.minLevel, level);
              const off = locked || !ready || running || (ik.on && j.id !== "gripper");
              const v = Math.round(pose[j.id]);
              const rid = `lab-j-${j.id}`;
              return (
                <div key={j.id} className={styles.range} data-selected={selectedId === j.id}>
                  <button type="button" className={styles.jointName} aria-pressed={selectedId === j.id} onClick={() => actions.select(j.id)}>{j.label}</button>
                  <input
                    id={rid} type="range" min={j.min} max={j.max} step={1} value={v} disabled={off}
                    aria-label={`${j.label} 각도`} aria-valuetext={`${v}${j.unit === "%" ? "퍼센트" : "도"}`}
                    onPointerDown={actions.beginEdit}
                    onKeyDown={(e) => { if (!e.repeat) actions.beginEdit(); }}
                    onChange={(e) => actions.setJoint(j.id, Number(e.target.value))}
                  />
                  <output htmlFor={rid}>{v}{j.unit}</output>
                  {locked ? <span className={styles.lockNote}>{LEVEL_LABEL[j.minLevel]}에서 열려요</span> : null}
                </div>
              );
            })}
          </div>
          <p className={styles.muted}>범위: {JOINTS.map((j) => `${j.label.split(" ")[0]} ${j.min}~${j.max}${j.unit}`).join(" / ")}</p>
        </Section>

        <Section title="프리셋 동작과 명령 큐" hint="동작을 고르면 아래 순서대로 실행돼요. 현재 단계는 강조됩니다.">
          <div className={styles.row} role="group" aria-label="프리셋 동작">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className={styles.chipBtn} aria-pressed={presetId === p.id} disabled={!ready || running} onClick={() => actions.loadPreset(p.id)} title={p.description}>
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <button type="button" className="btn-primary" onClick={actions.play} disabled={!ready || running || queue.length === 0}>▶ 실행</button>
            <button type="button" className="btn-ghost" onClick={actions.stop} disabled={!running}>■ 정지</button>
            <button type="button" className="btn-ghost" onClick={actions.addPose} disabled={!canQueueEdit}>현재 포즈 추가</button>
            <button type="button" className="btn-ghost" onClick={actions.clearQueue} disabled={!canQueueEdit || queue.length === 0}>큐 비우기</button>
          </div>
          {!isUnlocked("intermediate", level) ? <p className={styles.muted}>큐 편집은 중급부터 열려요. 초급에서는 프리셋을 실행해 볼 수 있어요.</p> : null}
          {queue.length === 0 ? (
            <p className={styles.muted}>명령이 없어요. 프리셋을 고르거나 포즈를 추가하세요.</p>
          ) : (
            <ol className={styles.queue} aria-label="명령 큐">
              {queue.map((c, i) => (
                <li key={c.id} className={styles.node} data-active={activeIndex === i} aria-current={activeIndex === i ? "step" : undefined}>
                  <span className={styles.nodeNo}>{i + 1}</span>
                  <span>{c.label}</span>
                  <span className={styles.nodeMs}>{c.ms}ms</span>
                  {canQueueEdit ? (
                    <button type="button" className={styles.nodeDel} aria-label={`${i + 1}번 ${c.label} 삭제`} onClick={() => actions.removeCommand(c.id)}>×</button>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
          <p className={styles.muted}>{running ? `실행 중: ${activeIndex + 1} / ${queue.length} 단계 (${queue[activeIndex]?.label ?? ""})` : `대기 중 · 총 ${queue.length}단계`}</p>
        </Section>

        {advanced ? (
          <Section title="IK 목표점 (고급)" hint="목표 좌표를 정하면 관절각이 자동 계산돼요. 관절 한계를 넘으면 가까운 자세에서 멈춰요.">
            <button type="button" className="btn-ghost" aria-pressed={ik.on} onClick={actions.toggleIk} disabled={!ready || running}>
              IK 목표점 {ik.on ? "켜짐" : "꺼짐"}
            </button>
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis} className={styles.range}>
                <label htmlFor={`lab-ik-${axis}`}>{axis.toUpperCase()}</label>
                <input
                  id={`lab-ik-${axis}`} type="range" min={IK_RANGE[axis][0]} max={IK_RANGE[axis][1]} step={0.05} value={ik[axis]} disabled={!ik.on || !ready || running}
                  aria-valuetext={`${ik[axis].toFixed(2)}`}
                  onPointerDown={actions.beginEdit} onKeyDown={(e) => { if (!e.repeat) actions.beginEdit(); }}
                  onChange={(e) => actions.setIk({ [axis]: Number(e.target.value) })}
                />
                <output htmlFor={`lab-ik-${axis}`}>{ik[axis].toFixed(2)}</output>
              </div>
            ))}
            <p className={styles.status} role="status" aria-live="polite">
              {ik.on && ikInfo ? (ikInfo.reached ? "목표에 도달했어요." : `관절 한계 때문에 목표에 닿지 못해요 (오차 ${ikInfo.error.toFixed(2)}).`) : "IK 를 켜면 현재 손끝 위치가 목표의 시작점이 돼요."}
            </p>
          </Section>
        ) : (
          <Section title="IK 목표점" hint="고급 레벨에서 열려요.">
            <p className={styles.muted}>고급: 목표 좌표 → 관절각 계산, 관절 한계 표시.</p>
          </Section>
        )}

        <Section title="로봇 해부" hint="부품을 고르면 설명이 바뀌어요. ‘부품 분해’를 켜면 3D 에서 라벨이 보여요.">
          <div className={styles.row} role="group" aria-label="부품 선택">
            {PARTS.map((p) => (
              <button key={p.id} type="button" className={styles.chipBtn} aria-pressed={selectedId === p.module} onClick={() => actions.select(p.module)}>
                {p.name}
              </button>
            ))}
          </div>
          <div className={styles.spec} aria-live="polite">
            {selectedModule ? (
              <>
                <p><strong>{selectedModule.label}</strong> · 현재 {Math.round(pose[selectedModule.id])}{selectedModule.unit} · 범위 {selectedModule.min}~{selectedModule.max}{selectedModule.unit}</p>
                <p>{selectedModule.desc[level]}</p>
                <ul>
                  {PARTS.filter((p) => p.module === selectedModule.id).map((p) => (
                    <li key={p.id}><strong>{p.name}</strong>: {p.desc[level]}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>선택된 부품이 없어요. 위에서 부품을 고르거나 관절 이름을 눌러 보세요.</p>
            )}
          </div>
        </Section>
      </div>

      <TrialForm level={level} onLevel={actions.setLevel} />
    </div>
  );
}
