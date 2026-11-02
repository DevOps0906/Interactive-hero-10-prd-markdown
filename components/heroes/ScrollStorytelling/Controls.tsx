"use client";

import { useId } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { ACCENTS, CHAPTERS, DEFAULT_SETTINGS, type HeroSettings, type HeroStatus } from "./config";
import s from "./ScrollStorytelling.module.css";

type Props = {
  settings: HeroSettings;
  onChange: (next: HeroSettings) => void;
  status: HeroStatus;
  chapter: number;
  tier: QualityTier;
  onGoTo: (i: number) => void;
};

// 7가지 인터랙션을 어디서 시연하는지 안내
const HELP = [
  "1 챕터: 위 점 또는 아래 챕터 버튼",
  "2 pin·scrub: 스크롤하면 stage가 고정된 채 진행",
  "3 카메라 경로: 챕터 2·3에서 위치 변화",
  "4 회전·폭발·재조립: 챕터 3 폭발, 4 재조립",
  "5 텍스트와 3D가 한 timeline으로 동기",
  "6 snap + dot 내비 + ←/→ 키",
  "7 리사이즈 refresh·터치·reduced-motion 정적 페이지",
];

export function Controls({ settings, onChange, status, chapter, tier, onGoTo }: Props) {
  const id = useId();
  const set = <K extends keyof HeroSettings>(k: K, v: HeroSettings[K]) => onChange({ ...settings, [k]: v });
  return (
    <details className={s.panel}>
      <summary>설정 · 도움말</summary>
      <div className={s.panelBody}>
        <p className={s.readout} aria-live="polite">
          상태 <b>{status}</b> · 챕터 <b>{chapter + 1}/{CHAPTERS.length}</b> · 품질 <b>{tier}</b>
        </p>
        <label htmlFor={`${id}-speed`}>속도 {settings.speed.toFixed(1)}</label>
        <input id={`${id}-speed`} type="range" min={0.5} max={2} step={0.1} value={settings.speed} onChange={(e) => set("speed", Number(e.target.value))} />
        <label htmlFor={`${id}-int`}>강도 {settings.intensity.toFixed(1)}</label>
        <input id={`${id}-int`} type="range" min={0.5} max={2} step={0.1} value={settings.intensity} onChange={(e) => set("intensity", Number(e.target.value))} />
        <fieldset className={s.row}>
          <legend>포인트 색</legend>
          {ACCENTS.map((c) => (
            <button key={c} type="button" className={s.swatch} style={{ background: c }} aria-label={`포인트 색 ${c}`} aria-pressed={settings.accent === c} onClick={() => set("accent", c)} />
          ))}
        </fieldset>
        <label className={s.row}>
          <input type="checkbox" checked={settings.snap} onChange={(e) => set("snap", e.target.checked)} /> 챕터 snap
        </label>
        <label htmlFor={`${id}-tier`}>품질</label>
        <select id={`${id}-tier`} value={settings.tier} onChange={(e) => set("tier", e.target.value as HeroSettings["tier"])}>
          <option value="auto">자동</option>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
        <div className={s.row}>
          {CHAPTERS.map((c, i) => (
            <button key={c.id} type="button" className="btn-ghost" onClick={() => onGoTo(i)} aria-label={`챕터 ${i + 1}로 이동`}>
              {i + 1}
            </button>
          ))}
        </div>
        <button type="button" className="btn-ghost" onClick={() => onChange(DEFAULT_SETTINGS)}>
          초기화
        </button>
        <ul className={s.help}>
          {HELP.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
