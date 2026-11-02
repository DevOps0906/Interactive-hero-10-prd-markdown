"use client";

import { FEATURE_LABELS, type FeatureKey, type HeroOptions, type HeroState } from "./config";

type Props = {
  options: HeroOptions;
  onChange: (next: HeroOptions) => void;
  onReset: () => void;
  onReplay: () => void;
  onTap: () => void;
  state: HeroState;
  tier: string;
  fps: number | null;
  axis: { wght: boolean; wdth: boolean };
  reducedMotion: boolean;
};

const SLIDERS: Array<{ key: "radius" | "intensity" | "speed" | "maxSkew"; label: string; min: number; max: number; step: number }> = [
  { key: "radius", label: "영향 반경(px)", min: 80, max: 400, step: 10 },
  { key: "intensity", label: "강도 --hero-intensity", min: 0, max: 1, step: 0.05 },
  { key: "speed", label: "속도 --hero-speed", min: 0.4, max: 2, step: 0.1 },
  { key: "maxSkew", label: "skew 상한(deg)", min: 0, max: 30, step: 1 },
];

export function Controls({ options, onChange, onReset, onReplay, onTap, state, tier, fps, axis, reducedMotion }: Props) {
  const toggle = (k: FeatureKey) => onChange({ ...options, features: { ...options.features, [k]: !options.features[k] } });
  const busy = state === "intro" || state === "transitioning" || state === "loading";
  return (
    <section
      aria-label="효과 설정"
      className="mx-auto w-full max-w-5xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[length:var(--text-body)] md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 text-[length:var(--text-h2)] font-semibold">설정 · 인터랙션 시연</h2>
        <p role="status" className="m-0 font-[family-name:var(--font-mono)] text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
          상태 {state} · 품질 {tier}
          {fps ? ` · ${fps}fps` : ""} · wght {axis.wght ? "O" : "X"} / wdth {axis.wdth ? "O" : "X"}
        </p>
      </div>
      {reducedMotion && <p className="mt-2 text-[var(--color-warning)]">모션 감소가 켜져 있어 정적으로 표시됩니다.</p>}
      <p className="mt-2 text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
        포인터를 타이틀 위로 움직여 보세요. 터치 기기는 스테이지를 탭합니다. 키보드: Tab으로 이동, Space/Enter로 버튼 실행.
        {!axis.wght && " (현재 폰트에 wght 축이 없어 스케일 폴백을 씁니다)"}
      </p>
      <fieldset className="mt-4 grid gap-2 border-0 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 text-[length:var(--text-caption)] text-[var(--color-text-muted)]">7가지 인터랙션 켜기/끄기</legend>
        {(Object.keys(FEATURE_LABELS) as FeatureKey[]).map((k) => (
          <label key={k} className="flex min-h-10 items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={options.features[k]} onChange={() => toggle(k)} />
            {FEATURE_LABELS[k]}
          </label>
        ))}
      </fieldset>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <label key={s.key} className="grid gap-1 text-[length:var(--text-caption)] text-[var(--color-text-muted)]">
            <span>
              {s.label}: <b className="text-[var(--color-text)]">{options[s.key]}</b>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={options[s.key]}
              onChange={(e) => onChange({ ...options, [s.key]: Number(e.target.value) })}
              className="accent-[var(--color-primary)]"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={onReplay} disabled={busy || reducedMotion}>
          인트로 다시 재생
        </button>
        <button type="button" className="btn-ghost" onClick={onTap} disabled={busy || reducedMotion}>
          탭 반응 시연
        </button>
        <button type="button" className="btn-ghost" onClick={onReset}>
          기본값 복원
        </button>
      </div>
    </section>
  );
}
