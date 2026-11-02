"use client";

import { useId, useState } from "react";
import { ACCENT_PRESETS, LAYERS, type FocusObject, type HeroSettings, type LayerId, type QualityMode } from "./config";
import type { HeroPhase } from "./useHeroInteraction";
import styles from "./depth-parallax.module.css";

interface ControlsProps {
  settings: HeroSettings;
  onChange: (patch: Partial<HeroSettings>) => void;
  onToggleLayer: (id: LayerId) => void;
  onReset: () => void;
  onNudge: (dx: number, dy: number) => void;
  onResetView: () => void;
  onScrollTo: (p: number) => void;
  onFocus: (id: string | null) => void;
  objects: FocusObject[];
  focusedId: string | null;
  progress: number;
  phase: HeroPhase;
  tier: string;
  fps: number | null;
  reduced: boolean;
  compact: boolean;
}

const PHASE_LABEL: Record<HeroPhase, string> = {
  loading: "로딩",
  intro: "인트로",
  idle: "대기",
  interacting: "조작 중",
  transitioning: "전환 중",
  fallback: "폴백",
};

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {props.label} <output htmlFor={id}>{props.value.toFixed(2)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      {props.label}
    </label>
  );
}

export function Controls(p: ControlsProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { settings: s } = p;

  return (
    <div className={styles.controls}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "설정 닫기" : "설정 · 인터랙션 데모"}
      </button>
      {open && (
        <div id={panelId} className={styles.panel} role="group" aria-label="Depth Parallax 설정">
          <p className={styles.status} role="status">
            상태 {PHASE_LABEL[p.phase]} · dolly {p.progress}% · 품질 {p.tier}
            {p.fps ? ` · ${p.fps.toFixed(0)}fps` : ""}
            {p.reduced ? " · 모션 감소" : ""}
          </p>

          <fieldset>
            <legend>1 · 깊이 레이어 (z-depth)</legend>
            {LAYERS.map((l) => (
              <Check
                key={l.id}
                label={`${l.name} (z ${l.z})`}
                checked={s.layers[l.id]}
                onChange={() => p.onToggleLayer(l.id)}
              />
            ))}
          </fieldset>

          <fieldset>
            <legend>2 · 포인터 카메라 (키보드 대체)</legend>
            <div className={styles.dpad}>
              <button type="button" aria-label="시점 위로" onClick={() => p.onNudge(0, 0.35)}>
                ↑
              </button>
              <button type="button" aria-label="시점 왼쪽" onClick={() => p.onNudge(-0.35, 0)}>
                ←
              </button>
              <button type="button" aria-label="시점 중앙" onClick={p.onResetView}>
                ●
              </button>
              <button type="button" aria-label="시점 오른쪽" onClick={() => p.onNudge(0.35, 0)}>
                →
              </button>
              <button type="button" aria-label="시점 아래로" onClick={() => p.onNudge(0, -0.35)}>
                ↓
              </button>
            </div>
            <Slider
              label="강도"
              value={s.intensity}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => p.onChange({ intensity: v })}
            />
            <Slider
              label="속도"
              value={s.speed}
              min={0.4}
              max={2}
              step={0.05}
              onChange={(v) => p.onChange({ speed: v })}
            />
          </fieldset>

          <fieldset>
            <legend>3 · 깊이 변위</legend>
            <Slider
              label="레이어 변위"
              value={s.displacement}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => p.onChange({ displacement: v })}
            />
          </fieldset>

          <fieldset>
            <legend>4 · 스크롤 dolly</legend>
            <div className={styles.row}>
              <button type="button" onClick={() => p.onScrollTo(0)}>
                시작
              </button>
              <button type="button" onClick={() => p.onScrollTo(0.5)}>
                중간
              </button>
              <button type="button" onClick={() => p.onScrollTo(1)}>
                끝
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>5 · Fog · 광원</legend>
            <Check label="Fog" checked={s.fog} onChange={(v) => p.onChange({ fog: v })} />
            <Check label="커서 광원" checked={s.light} onChange={(v) => p.onChange({ light: v })} />
            <div className={styles.row} role="group" aria-label="포인트 색">
              {ACCENT_PRESETS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={s.accent === a.value}
                  onClick={() => p.onChange({ accent: a.value })}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>6 · 오브젝트 포커스</legend>
            <div className={styles.row}>
              {p.objects.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={p.focusedId === o.id}
                  onClick={() => p.onFocus(p.focusedId === o.id ? null : o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>7 · 모바일·접근성</legend>
            <Check
              label="모바일 카메라 범위 축소"
              checked={s.compactRange || p.compact}
              disabled={p.compact}
              onChange={(v) => p.onChange({ compactRange: v })}
            />
            <Check
              label="모션 줄이기"
              checked={s.reduceMotion || p.reduced}
              disabled={p.reduced && !s.reduceMotion}
              onChange={(v) => p.onChange({ reduceMotion: v })}
            />
            <div className={styles.field}>
              <label htmlFor={`${panelId}-q`}>품질</label>
              <select
                id={`${panelId}-q`}
                value={s.quality}
                onChange={(e) => p.onChange({ quality: e.target.value as QualityMode })}
              >
                <option value="auto">자동</option>
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </fieldset>

          <button type="button" className={styles.reset} onClick={p.onReset}>
            설정 초기화
          </button>
        </div>
      )}
    </div>
  );
}
