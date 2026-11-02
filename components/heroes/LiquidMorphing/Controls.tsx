"use client";

import type { QualityTier } from "@/lib/hero/performance";
import { PRESETS, type HeroState, type PresetId, type QualitySetting, type Settings } from "./config";
import styles from "./LiquidMorphing.module.css";

type Props = {
  settings: Settings;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  state: HeroState;
  tier: QualityTier;
  reduced: boolean;
  stats: { fps: number; ms: number } | null;
  onPreset: (id: PresetId) => void;
  onReplayIntro: () => void;
  onPulse: () => void;
};

const STATE_LABEL: Record<HeroState, string> = {
  loading: "loading",
  intro: "intro",
  idle: "idle",
  interacting: "interacting",
  transitioning: "transitioning",
  fallback: "fallback",
};

export default function Controls({ settings: s, update, state, tier, reduced, stats, onPreset, onReplayIntro, onPulse }: Props) {
  const busy = state === "loading" || state === "fallback";
  return (
    <section id="lm-controls" className={styles.panel} aria-labelledby="lm-controls-title" tabIndex={-1}>
      <div className={styles.panelHead}>
        <h2 id="lm-controls-title">조작 패널 · 7가지 인터랙션 시연</h2>
        <p role="status" className={styles.status}>
          상태 <b>{STATE_LABEL[state]}</b> · 품질 <b>{tier}</b>
          {stats ? <> · {stats.fps}fps ({stats.ms.toFixed(1)}ms)</> : null}
          {reduced ? " · 모션 감소: 정지 렌더" : null}
        </p>
      </div>
      <p className={styles.help}>
        마우스: 스테이지 위에서 이동(포인터 반응)·누르기/드래그(변형 강화). 키보드: 아래 컨트롤에 Tab으로 이동해 슬라이더는 방향키, 버튼은 Enter/Space.
      </p>

      <div className={styles.grid}>
        <fieldset className={styles.group}>
          <legend>1·2 형태</legend>
          <div className={styles.row} role="group" aria-label="렌더 모드">
            <button type="button" className={styles.chip} aria-pressed={s.mode === "blob"} onClick={() => update("mode", "blob")} disabled={busy}>
              노이즈 Blob
            </button>
            <button type="button" className={styles.chip} aria-pressed={s.mode === "metaball"} onClick={() => update("mode", "metaball")} disabled={busy}>
              SDF 메타볼
            </button>
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>3 포인터</legend>
          <label className={styles.check}>
            <input type="checkbox" checked={s.pointerOn} onChange={(e) => update("pointerOn", e.target.checked)} />
            포인터 위치 → 셰이더 uniform
          </label>
          <button type="button" className={styles.chip} onClick={onPulse} disabled={busy}>
            펄스 (클릭 대체)
          </button>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>4 Iridescent</legend>
          <label className={styles.field}>
            <span>Fresnel 강도 {s.iridescence.toFixed(2)}</span>
            <input type="range" min={0} max={1} step={0.05} value={s.iridescence} onChange={(e) => update("iridescence", Number(e.target.value))} />
          </label>
          <label className={styles.field}>
            <span>포인트 컬러</span>
            <input type="color" value={s.accent} onChange={(e) => update("accent", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>5 스크롤</legend>
          <label className={styles.check}>
            <input type="checkbox" checked={s.scrollLink} onChange={(e) => update("scrollLink", e.target.checked)} />
            스크롤 → scale·noise·morph
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={s.scrollManual} onChange={(e) => update("scrollManual", e.target.checked)} />
            수동 진행도 사용
          </label>
          <label className={styles.field}>
            <span>진행도 {s.scrollValue.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={s.scrollValue}
              disabled={!s.scrollManual}
              onChange={(e) => update("scrollValue", Number(e.target.value))}
            />
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>6 GSAP 타임라인</legend>
          <div className={styles.row} role="group" aria-label="프리셋 전환">
            {PRESETS.map((p) => (
              <button key={p.id} type="button" className={styles.chip} onClick={() => onPreset(p.id)} disabled={busy}>
                {p.label}
              </button>
            ))}
            <button type="button" className={styles.chip} onClick={onReplayIntro} disabled={busy}>
              인트로 재생
            </button>
          </div>
          <label className={styles.field}>
            <span>속도 {s.speed.toFixed(2)}</span>
            <input type="range" min={0} max={3} step={0.05} value={s.speed} onChange={(e) => update("speed", Number(e.target.value))} />
          </label>
          <label className={styles.field}>
            <span>강도 {s.intensity.toFixed(2)}</span>
            <input type="range" min={0} max={2} step={0.05} value={s.intensity} onChange={(e) => update("intensity", Number(e.target.value))} />
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>7 성능</legend>
          <label className={styles.field}>
            <span>품질 (auto는 프레임 시간으로 하향)</span>
            <select value={s.quality} onChange={(e) => update("quality", e.target.value as QualitySetting)}>
              <option value="auto">auto</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
        </fieldset>
      </div>
    </section>
  );
}
