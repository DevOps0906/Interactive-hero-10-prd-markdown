"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import {
  ACCENTS,
  SHAPES,
  type FieldMode,
  type HeroSettings,
  type HeroState,
  type HeroStats,
  type QualitySetting,
} from "./config";

interface ControlsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: HeroSettings;
  onChange: <K extends keyof HeroSettings>(key: K, value: HeroSettings[K]) => void;
  state: HeroState;
  stats: HeroStats | null;
  reducedMotion: boolean;
  onNudge: (direction: -1 | 1) => void;
  onReplay: () => void;
  onRetry: () => void;
}

const btn =
  "min-h-10 rounded-control border border-border px-3 text-caption text-text-muted hover:bg-surface-hover hover:text-text disabled:opacity-40 disabled:pointer-events-none";
const pressed = "aria-pressed:border-primary aria-pressed:bg-primary-soft aria-pressed:text-primary";

const FIELDS: readonly { id: FieldMode; label: string }[] = [
  { id: "repel", label: "반발" },
  { id: "attract", label: "인력" },
];
const QUALITIES: readonly { id: QualitySetting; label: string }[] = [
  { id: "auto", label: "자동" },
  { id: "low", label: "낮음 (8천)" },
  { id: "medium", label: "중간 (2.4만)" },
  { id: "high", label: "높음 (6만)" },
];

export function Controls({
  open,
  onOpenChange,
  settings,
  onChange,
  state,
  stats,
  reducedMotion,
  onNudge,
  onReplay,
  onRetry,
}: ControlsProps) {
  const panelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const busy = state === "loading" || state === "intro";
  const unavailable = busy || state === "error";

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      onOpenChange(false);
      toggleRef.current?.focus();
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 lg:items-end" onKeyDown={onKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        className={`${btn} order-1 lg:order-2 lg:self-end`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onOpenChange(!open)}
      >
        {open ? "설정 패널 닫기" : "설정 패널 열기"}
      </button>

      <section
        id={panelId}
        aria-label="Particle Universe 설정"
        hidden={!open}
        className="grid w-full max-w-[20rem] gap-4 rounded-card border border-border bg-surface p-4 text-caption text-text order-2 lg:order-1"
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-body font-semibold outline-none">
          데모 조작
        </h2>

        {state === "error" && (
          <div role="alert" className="grid gap-2 text-danger">
            <span>WebGL을 시작하지 못해 정지 이미지로 대체했습니다.</span>
            <button type="button" className={btn} onClick={onRetry}>
              다시 시도
            </button>
          </div>
        )}

        <fieldset className="grid gap-2" disabled={unavailable}>
          <legend className="mb-1 text-text-muted">형태 변환 (구 / 나선 / 브랜드 마크)</legend>
          <div className="flex flex-wrap gap-2">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`${btn} ${pressed}`}
                aria-pressed={settings.shape === s.id}
                onClick={() => onChange("shape", s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2" disabled={unavailable}>
          <legend className="mb-1 text-text-muted">커서 필드 (마우스를 스테이지 위로)</legend>
          <div className="flex gap-2">
            {FIELDS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`${btn} ${pressed}`}
                aria-pressed={settings.field === f.id}
                onClick={() => onChange("field", f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2" disabled={unavailable}>
          <legend className="mb-1 text-text-muted">회전</legend>
          <label className="flex min-h-10 items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoRotate}
              onChange={(e) => onChange("autoRotate", e.target.checked)}
              disabled={reducedMotion}
            />
            자동회전 (드래그 중에는 멈춤)
          </label>
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => onNudge(-1)} aria-label="왼쪽으로 회전">
              ◀ 회전
            </button>
            <button type="button" className={btn} onClick={() => onNudge(1)} aria-label="오른쪽으로 회전">
              회전 ▶
            </button>
          </div>
        </fieldset>

        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="flex justify-between text-text-muted">
              <span>속도 (--hero-speed)</span>
              <span>{settings.speed.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.speed}
              onChange={(e) => onChange("speed", Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1">
            <span className="flex justify-between text-text-muted">
              <span>강도 (--hero-intensity)</span>
              <span>{settings.intensity.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.intensity}
              onChange={(e) => onChange("intensity", Number(e.target.value))}
            />
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-text-muted">강조색 (--hero-accent)</legend>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                className={`${btn} ${pressed}`}
                aria-pressed={settings.accent === a.value}
                onClick={() => onChange("accent", a.value)}
              >
                <span
                  aria-hidden="true"
                  className="mr-1 inline-block size-2.5 rounded-full align-middle"
                  style={{ background: a.value }}
                />
                {a.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1">
          <span className="text-text-muted">입자 수 프리셋</span>
          <select
            className="min-h-10 rounded-control border border-input bg-surface px-2 text-text"
            value={settings.quality}
            onChange={(e) => onChange("quality", e.target.value as QualitySetting)}
          >
            {QUALITIES.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className={btn} onClick={onReplay} disabled={unavailable}>
            인트로 다시 재생
          </button>
          <span className="font-mono text-text-muted" aria-live="off">
            {stats
              ? `${reducedMotion ? "정지" : `${stats.fps.toFixed(0)}fps`} · ${stats.count.toLocaleString("ko-KR")}개 · DPR ${stats.dpr} · ${stats.tier}`
              : "측정 대기"}
          </span>
        </div>

        <p className="text-text-muted">
          드래그로 회전, 마우스를 움직이면 입자가 반응합니다. 모션 감소 설정 시 정지 화면으로 표시됩니다.
        </p>
      </section>
    </div>
  );
}
