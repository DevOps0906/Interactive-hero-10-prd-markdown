"use client";

import { useState, type MutableRefObject } from "react";
import { PHASE_LABEL, type HeroSettings, type Phase, type SceneCommands, type Stats } from "./config";

interface ControlsProps {
  settings: HeroSettings;
  onChange: (patch: Partial<HeroSettings>) => void;
  phase: Phase;
  stats: Stats | null;
  reduced: boolean;
  commandsRef: MutableRefObject<SceneCommands | null>;
}

const GUIDE: { n: number; title: string; how: string }[] = [
  { n: 1, title: "입자 초기화", how: "밀도 슬라이더 또는 초기화 버튼. 균일 지터 격자로 재배치됩니다." },
  { n: 2, title: "인력/척력", how: "스테이지 위에서 커서를 움직이고, 힘 방향 라디오로 인력/척력을 전환합니다." },
  { n: 3, title: "근접 간선", how: "근접선 체크박스와 거리 슬라이더. 멀수록 선이 옅어집니다." },
  { n: 4, title: "커서 궤적", how: "커서를 빠르게 움직이면 궤적 입자가 생기고 서서히 사라집니다." },
  { n: 5, title: "클릭 폭발", how: "스테이지를 클릭/탭하거나 폭발 버튼. 마찰로 감쇠됩니다." },
  { n: 6, title: "문양 재집결", how: "폭발 후 자동 재집결, 또는 문양 고정 버튼으로 전환합니다." },
  { n: 7, title: "성능 최적화", how: "통계 표시를 켜면 입자 수·간선 수·검사 쌍·FPS·품질 등급을 봅니다." },
];

const row = "flex items-center justify-between gap-3 text-[length:var(--text-caption)]";
const btn =
  "h-[var(--size-gnb-item)] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 font-semibold hover:bg-[var(--color-surface-hover)]";

export default function Controls({ settings, onChange, phase, stats, reduced, commandsRef }: ControlsProps) {
  const [locked, setLocked] = useState(false);

  const slider = (id: string, label: string, key: "speed" | "intensity" | "density" | "linkDistance", min: number, max: number, step: number) => (
    <label htmlFor={id} className={row}>
      <span>
        {label} <output className="text-[var(--color-text-muted)]">{settings[key]}</output>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={settings[key]}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
        className="w-40 accent-[var(--color-primary)]"
      />
    </label>
  );
  const check = (id: string, label: string, key: "showEdges" | "showTrail" | "showStats") => (
    <label htmlFor={id} className={row}>
      <span>{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={settings[key]}
        onChange={(e) => onChange({ [key]: e.target.checked })}
        className="size-5 accent-[var(--color-primary)]"
      />
    </label>
  );

  return (
    <section
      id="cc-controls"
      aria-labelledby="cc-controls-title"
      className="grid gap-6 p-6 md:grid-cols-2"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="grid content-start gap-3">
        <h2 id="cc-controls-title" className="text-lg font-semibold">
          데모 조작 패널
        </h2>
        <p role="status" aria-live="polite" className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          상태: {PHASE_LABEL[phase]}
          {reduced ? " · 모션 감소 설정: 정적 렌더링" : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => commandsRef.current?.burst()}>
            폭발
          </button>
          <button
            type="button"
            className={btn}
            aria-pressed={locked}
            onClick={() => setLocked(commandsRef.current?.toggleLogo() ?? false)}
          >
            문양 고정
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => {
              commandsRef.current?.reset();
              setLocked(false);
            }}
          >
            초기화
          </button>
        </div>
        {slider("cc-speed", "속도 (--hero-speed)", "speed", 0.25, 2, 0.05)}
        {slider("cc-intensity", "강도 (--hero-intensity)", "intensity", 0.25, 2, 0.05)}
        {slider("cc-density", "밀도", "density", 0.25, 1.5, 0.05)}
        {slider("cc-link", "근접 거리(px)", "linkDistance", 50, 200, 5)}
        <fieldset className={row}>
          <legend className="sr-only">힘 방향</legend>
          <span>힘 방향</span>
          <span className="flex gap-4">
            {(["attract", "repel"] as const).map((m) => (
              <label key={m} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="cc-force"
                  checked={settings.forceMode === m}
                  onChange={() => onChange({ forceMode: m })}
                  className="accent-[var(--color-primary)]"
                />
                {m === "attract" ? "인력" : "척력"}
              </label>
            ))}
          </span>
        </fieldset>
        {check("cc-edges", "근접선", "showEdges")}
        {check("cc-trail", "커서 궤적", "showTrail")}
        {check("cc-stats", "통계 표시", "showStats")}
        {settings.showStats && stats && (
          <p className="font-[var(--font-mono)] text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
            {stats.fps} fps · 입자 {stats.particles} · 간선 {stats.edges} · 쌍 검사 {stats.pairChecks} (전수 {(stats.particles * (stats.particles - 1)) / 2}) · 등급 {stats.tier} · DPR {stats.dpr}
          </p>
        )}
      </div>
      <div className="grid content-start gap-2">
        <h2 className="text-lg font-semibold">7가지 인터랙션 검증 가이드</h2>
        <ol className="grid gap-2 text-[length:var(--text-caption)]">
          {GUIDE.map((g) => (
            <li key={g.n}>
              <strong>
                {g.n}. {g.title}
              </strong>{" "}
              <span className="text-[var(--color-text-muted)]">{g.how}</span>
            </li>
          ))}
        </ol>
        <p className="text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          키보드: Tab으로 버튼·슬라이더 이동, Space/Enter로 실행. 스테이지 입자는 장식이며 제목·설명·CTA는 효과 없이도 표시됩니다.
        </p>
      </div>
    </section>
  );
}
