"use client";

import { AXIS, DEFAULT_OPTIONS, type KineticOptions } from "./config";

interface ControlsProps {
  options: KineticOptions;
  onChange: (next: KineticOptions) => void;
  onReplay: () => void;
  disabled: boolean;
}

const row = "grid grid-cols-[110px_1fr_48px] items-center gap-3 text-[length:var(--text-body)]";
const num = "text-right font-mono text-[length:var(--text-caption)] text-[var(--color-text-muted)]";

/** 7가지 인터랙션을 직접 검증할 수 있는 옵션 패널·도움말. 모든 조작은 키보드로 가능하다. */
export function Controls({ options, onChange, onReplay, disabled }: ControlsProps) {
  const set = <K extends keyof KineticOptions>(k: K, v: KineticOptions[K]) => onChange({ ...options, [k]: v });
  const slider = (id: string, label: string, k: "speed" | "intensity" | "weight" | "width", min: number, max: number, step: number) => (
    <label className={row} htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={options[k]} disabled={disabled}
        onChange={(e) => set(k, Number(e.target.value))} className="accent-[var(--color-primary)]" />
      <output htmlFor={id} className={num}>{options[k]}</output>
    </label>
  );

  return (
    <section id="kt-controls" aria-labelledby="kt-controls-title" tabIndex={-1}
      className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-2 md:px-10">
      <div className="grid content-start gap-4">
        <h2 id="kt-controls-title" className="text-[length:var(--text-h2)] font-semibold">조작 패널</h2>
        {slider("kt-speed", "마키 속도 (2)", "speed", 0, 4, 0.1)}
        {slider("kt-intensity", "반응 강도 (2·5)", "intensity", 0, 2, 0.1)}
        {slider("kt-weight", "굵기 wght (3)", "weight", AXIS.weight.min, AXIS.weight.max, AXIS.weight.step)}
        {slider("kt-width", "너비 wdth (3)", "width", AXIS.width.min, AXIS.width.max, AXIS.width.step)}
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={options.skew} disabled={disabled} onChange={(e) => set("skew", e.target.checked)}
            className="size-5 accent-[var(--color-primary)]" />
          포인터 속도 skew (5)
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={options.pin} disabled={disabled} onChange={(e) => set("pin", e.target.checked)}
            className="size-5 accent-[var(--color-primary)]" />
          Pin/Scrub 확대·전환 (6)
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={onReplay} disabled={disabled}>글자 reveal 다시 보기 (4)</button>
          <button type="button" className="btn-ghost" onClick={() => onChange(DEFAULT_OPTIONS)}>기본값</button>
        </div>
      </div>

      <div className="grid content-start gap-3 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
        <h2 className="text-[length:var(--text-h2)] font-semibold text-[var(--color-text)]">도움말</h2>
        <ul className="grid list-disc gap-2 pl-5">
          <li>(1) 마키: 줄마다 같은 문구를 측정값만큼 복제해 끊김 없이 순환합니다.</li>
          <li>(2) 스크롤(마우스 휠, Space, PageUp/Down, 방향키)하면 속도·방향이 따라 바뀝니다.</li>
          <li>(3) wght·wdth 슬라이더는 폰트가 해당 축을 지원할 때만 적용됩니다.</li>
          <li>(4) 제목 글자는 회전·y 이동으로 순차 등장하며 버튼으로 다시 재생합니다.</li>
          <li>(5) 마우스를 빠르게 움직이면 제목이 기울어집니다(최대 12도).</li>
          <li>(6) 스크롤하면 제목이 확대되고 다음 장면 문구로 전환됩니다.</li>
          <li>(7) 복제본은 aria-hidden이며, 모션 감소 설정 시 정적 화면으로 대체됩니다.</li>
        </ul>
      </div>
    </section>
  );
}
