"use client";

import { ACCENTS, DEFAULT_OPTIONS, INTERACTIONS, type SpotlightOptions } from "./config";
import styles from "./SpotlightReveal.module.css";

type ControlsProps = {
  options: SpotlightOptions;
  onChange: (patch: Partial<SpotlightOptions>) => void;
  seen: readonly number[];
  tierLabel: string;
  reducedMotion: boolean;
  onExpand: () => void;
  onReset: () => void;
};

/** 옵션 패널 + 7개 인터랙션 검증 체크리스트. */
export function Controls({ options, onChange, seen, tierLabel, reducedMotion, onExpand, onReset }: ControlsProps) {
  return (
    <section id="sr-controls" className={styles.panel} aria-labelledby="sr-controls-title">
      <div>
        <h2 id="sr-controls-title">설정</h2>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span>
              마스크 크기 <output>{options.radius}px</output>
            </span>
            <input
              type="range"
              min={80}
              max={240}
              step={10}
              value={options.radius}
              onChange={(e) => onChange({ radius: Number(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            <span>
              속도 (--hero-speed) <output>{options.speed.toFixed(1)}x</output>
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={options.speed}
              onChange={(e) => onChange({ speed: Number(e.target.value) })}
            />
          </label>
          <label className={styles.field}>
            <span>
              왜곡 강도 (--hero-intensity) <output>{options.intensity.toFixed(2)}</output>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={options.intensity}
              onChange={(e) => onChange({ intensity: Number(e.target.value) })}
            />
          </label>
          <div className={styles.row} role="group" aria-label="강조색 (--hero-accent)">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={styles.btn}
                aria-pressed={options.accent === a.value}
                onClick={() => onChange({ accent: a.value })}
              >
                <span className={styles.swatch} style={{ "--sw": a.value } as React.CSSProperties}>
                  <i />
                  {a.name}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={options.distortion}
              onClick={() => onChange({ distortion: !options.distortion })}
            >
              속도 왜곡 {options.distortion ? "켬" : "끔"}
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={options.showLayers}
              onClick={() => onChange({ showLayers: !options.showLayers })}
            >
              레이어 겹쳐 보기
            </button>
          </div>
          <div className={styles.row} role="group" aria-label="터치 모드">
            <button
              type="button"
              className={styles.btn}
              aria-pressed={options.touchMode === "drag"}
              onClick={() => onChange({ touchMode: "drag" })}
            >
              터치: 드래그 Reveal
            </button>
            <button
              type="button"
              className={styles.btn}
              aria-pressed={options.touchMode === "toggle"}
              onClick={() => onChange({ touchMode: "toggle" })}
            >
              터치: 탭 Toggle
            </button>
          </div>
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={onExpand}>
              장면 확장
            </button>
            <button type="button" className={styles.btn} onClick={onReset}>
              위치·크기 초기화
            </button>
            <button type="button" className={styles.btn} onClick={() => onChange({ ...DEFAULT_OPTIONS })}>
              옵션 기본값
            </button>
          </div>
          <p className={styles.hint}>
            품질 등급: {tierLabel} · 모션 감소: {reducedMotion ? "켜짐(애니메이션 최소화)" : "꺼짐"}
          </p>
        </div>
      </div>
      <div>
        <h2>인터랙션 검증</h2>
        <ol className={styles.list}>
          {INTERACTIONS.map((it) => {
            const done = seen.includes(it.id);
            return (
              <li key={it.id}>
                <span className={styles.done} data-done={done}>
                  {done ? "확인" : "대기"} {it.id}
                </span>
                <span>
                  {it.label}
                  <small>{it.how}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
