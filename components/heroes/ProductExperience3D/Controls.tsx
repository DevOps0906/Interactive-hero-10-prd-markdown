"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { QUALITY_PRESETS, type ProductData } from "./config";
import type { HeroActions, HeroState, Phase, QualityMode } from "./useHeroInteraction";
import styles from "./ProductExperience3D.module.css";

const PHASE_LABEL: Record<Phase, string> = {
  loading: "로딩 중",
  intro: "인트로 재생 중",
  idle: "대기",
  interacting: "조작 중",
  transitioning: "전환 중",
  fallback: "폴백 (3D 비활성)",
};

interface ControlsProps {
  product: ProductData;
  state: HeroState;
  actions: HeroActions;
  reduced: boolean;
  tier: QualityTier;
  fpsRef: MutableRefObject<number>;
}

/** 설정 패널·도움말. 3D 스테이지는 aria-hidden 이므로 모든 조작·정보는 이 DOM 패널로도 가능하다. */
export default function Controls({ product, state, actions, reduced, tier, fpsRef }: ControlsProps) {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setFps(Math.round(fpsRef.current)), 1000);
    return () => window.clearInterval(id);
  }, [fpsRef]);

  const canAct = state.phase === "idle" || state.phase === "interacting";
  const finish = product.finishes.find((f) => f.id === state.finishId) ?? product.finishes[0];
  const part = product.parts.find((p) => p.id === state.selected) ?? null;

  return (
    <section id="pe3d-controls" className={styles.panel} aria-labelledby="pe3d-panel-title">
      <div className={styles.panelHead}>
        <div>
          <h2 id="pe3d-panel-title">{product.name} 옵션</h2>
          <p className={styles.muted}>{product.tagline}</p>
        </div>
        {/* 이 페이지의 CTA 1개 */}
        <button type="button" className="btn-primary" aria-pressed={state.exploded} disabled={!canAct && state.phase !== "fallback"} onClick={() => actions.toggleExplode()}>
          {state.exploded ? "내부 구조 닫기" : "내부 구조 보기"}
        </button>
      </div>

      <p className={styles.srOnly} role="status">
        {PHASE_LABEL[state.phase]}
        {state.phase === "fallback" && state.error ? ` — ${state.error}` : ""}
      </p>

      <div className={styles.grid}>
        <fieldset className={styles.group}>
          <legend>색상 · 소재 (3)</legend>
          <div className={styles.swatches} role="group" aria-label="색상 옵션">
            {product.finishes.map((f) => (
              <button key={f.id} type="button" className={styles.swatch} aria-pressed={f.id === state.finishId} disabled={!canAct} onClick={() => actions.setFinish(f)}>
                <span aria-hidden="true" className={styles.chip} style={{ background: f.color }} />
                {f.label}
              </button>
            ))}
          </div>
          <p className={styles.muted}>
            선택: {finish.label} · {finish.sku} · {finish.price}
          </p>
          <label className={styles.range}>
            <span>Roughness</span>
            <input type="range" min={0} max={1} step={0.01} value={state.roughness} onChange={(e) => actions.setMaterial("roughness", Number(e.target.value))} />
            <output>{state.roughness.toFixed(2)}</output>
          </label>
          <label className={styles.range}>
            <span>Metalness</span>
            <input type="range" min={0} max={1} step={0.01} value={state.metalness} onChange={(e) => actions.setMaterial("metalness", Number(e.target.value))} />
            <output>{state.metalness.toFixed(2)}</output>
          </label>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>부품 · 핫스팟 (4, 6)</legend>
          <div className={styles.partList} role="group" aria-label="부품 목록">
            {product.parts.map((p) => (
              <button key={p.id} type="button" className={styles.partBtn} aria-pressed={state.selected === p.id} disabled={!canAct && state.phase !== "fallback"} onClick={() => actions.select(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
          <div className={styles.spec} aria-live="polite">
            {part ? (
              <>
                <h3>{part.name}</h3>
                <p>{part.summary}</p>
                <dl>
                  {part.rows.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className={styles.muted}>부품을 선택하면 상세 스펙이 표시됩니다. 3D 화면의 핫스팟을 눌러도 됩니다.</p>
            )}
          </div>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>시점 (2, 5)</legend>
          <div className={styles.row}>
            <button type="button" className="btn-ghost" disabled={!canAct} onClick={() => actions.nudge(-1)} aria-label="왼쪽으로 30도 회전">
              ◀ 회전
            </button>
            <button type="button" className="btn-ghost" disabled={!canAct} onClick={() => actions.nudge(1)} aria-label="오른쪽으로 30도 회전">
              회전 ▶
            </button>
            <button type="button" className="btn-ghost" disabled={!canAct} onClick={actions.reset}>
              시점 초기화
            </button>
          </div>
          <ul className={styles.help}>
            <li>드래그: 회전 (이동·과도한 확대 제한)</li>
            <li>휠 / 핀치: 확대·축소 (범위 제한)</li>
            <li>모바일: 가로 드래그는 회전, 세로 스와이프는 페이지 스크롤</li>
            <li>키보드: Tab으로 버튼 이동, Enter/Space로 실행</li>
          </ul>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>성능 · 연출 (7)</legend>
          <label className={styles.range}>
            <span>품질</span>
            <select value={state.qualityMode} onChange={(e) => actions.setQuality(e.target.value as QualityMode)}>
              <option value="auto">자동</option>
              {(Object.keys(QUALITY_PRESETS) as QualityTier[]).map((t) => (
                <option key={t} value={t}>
                  {QUALITY_PRESETS[t].label}
                </option>
              ))}
            </select>
            <output>{QUALITY_PRESETS[tier].label}</output>
          </label>
          <label className={styles.range}>
            <span>속도</span>
            <input type="range" min={0.2} max={2} step={0.1} value={state.speed} onChange={(e) => actions.setHero("speed", Number(e.target.value))} />
            <output>{state.speed.toFixed(1)}</output>
          </label>
          <label className={styles.range}>
            <span>강도</span>
            <input type="range" min={0.3} max={1.6} step={0.1} value={state.intensity} onChange={(e) => actions.setHero("intensity", Number(e.target.value))} />
            <output>{state.intensity.toFixed(1)}</output>
          </label>
          <p className={styles.muted}>
            상태: {PHASE_LABEL[state.phase]} · {fps > 0 ? `${fps} fps` : "fps 측정 대기"} · 모션 감소 {reduced ? "켜짐" : "꺼짐"}
          </p>
        </fieldset>
      </div>
    </section>
  );
}
