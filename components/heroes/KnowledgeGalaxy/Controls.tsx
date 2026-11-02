"use client";

import { useId, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { QualityTier } from "@/lib/hero/performance";
import { ACCENTS, DEFAULT_SETTINGS, GROUP_NAMES, type Settings } from "./config";
import type { GraphModel } from "./graphModel";
import type { SceneStats } from "./Scene";
import type { HeroActions, InteractionState } from "./useHeroInteraction";
import styles from "./kg.module.css";

type Props = {
  model: GraphModel;
  totalNodes: number;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  state: InteractionState;
  actions: HeroActions;
  stats: SceneStats | null;
  tier: QualityTier;
  reducedMotion: boolean;
  fallback: boolean;
};

const PHASE_LABEL: Record<InteractionState["phase"], string> = {
  loading: "로딩 중",
  intro: "인트로 재생 중",
  idle: "대기",
  interacting: "조작 중",
  transitioning: "카메라 이동 중",
  error: "오류 (대체 화면)",
};

const INTERACTIONS = [
  "1 데이터·시뮬레이션 분리: 노드를 드래그하면 레이아웃이 재배치됩니다. '시뮬레이션 재가열'로 다시 흔들어 보세요.",
  "2 OrbitControls: 빈 곳 드래그=회전, 휠/핀치=줌, 노드 위 드래그=노드 이동(카메라와 충돌 없음).",
  "3 순차 등장: '인트로 재생'으로 중심 → 1-hop → 2-hop 노드와 연결선이 차례로 나타납니다.",
  "4 hover / 선택: 마우스를 올리면 강조, 클릭하면 선택 링과 연결 간선이 강조됩니다.",
  "5 라벨: 3D 좌표를 따라가며 거리·겹침·가림에 따라 표시가 제한됩니다.",
  "6 포커스: 선택 시 카메라가 이동하고, '이웃만 보기'로 1-hop 필터, '전체 보기'로 복귀합니다.",
  "7 성능: 간선 flow dots, 인스턴싱, 시뮬레이션 정지 토글, 노드 수 제한 슬라이더.",
];

export default function Controls({ model, totalNodes, settings, setSettings, state, actions, stats, tier, reducedMotion, fallback }: Props) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const interactive = !fallback && (state.phase === "idle" || state.phase === "interacting" || state.phase === "transitioning");
  const nodes = model.data.nodes;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nodes.filter((nd) => model.indexOf.has(nd.id) && (!q || nd.label.toLowerCase().includes(q)));
  }, [nodes, model, query]);
  const selected = nodes.find((nd) => nd.id === state.selectedId);
  const neighbors = state.selectedId ? model.adj[model.indexOf.get(state.selectedId) ?? 0].map((j) => nodes.find((nd) => nd.id === model.ids[j])).filter(Boolean) : [];

  return (
    <section className={styles.controls} aria-label="Knowledge Galaxy 조작 패널">
      <div className={styles.toolbar} role="toolbar" aria-label="그래프 조작">
        <button type="button" className={styles.tbtn} onClick={actions.resetView} disabled={!interactive}>전체 보기</button>
        <button type="button" className={styles.tbtn} aria-pressed={state.filter} onClick={actions.toggleFilter} disabled={!interactive || !state.selectedId}>이웃만 보기</button>
        <button type="button" className={styles.tbtn} onClick={actions.replayIntro} disabled={fallback || state.phase === "loading"}>인트로 재생</button>
        <button type="button" className={styles.tbtn} onClick={actions.reheat} disabled={!interactive}>시뮬레이션 재가열</button>
        <span className={styles.status} role="status" aria-live="polite">
          상태: {PHASE_LABEL[state.phase]}
          {selected ? ` · 선택: ${selected.label}` : ""}
        </span>
      </div>

      <details className={styles.panel}>
        <summary>설정 · 노드 · 도움말</summary>
        <div className={styles.panelBody}>
          <fieldset className={styles.group}>
            <legend>표시 설정</legend>
            <label className={styles.row}>
              <span>속도 {settings.speed.toFixed(1)}</span>
              <input type="range" min={0.3} max={2} step={0.1} value={settings.speed} onChange={(e) => set("speed", Number(e.target.value))} />
            </label>
            <label className={styles.row}>
              <span>강도 {settings.intensity.toFixed(1)}</span>
              <input type="range" min={0.4} max={1.6} step={0.1} value={settings.intensity} onChange={(e) => set("intensity", Number(e.target.value))} />
            </label>
            <label className={styles.row}>
              <span>노드 수 제한 {Math.min(settings.nodeCap, totalNodes)}</span>
              <input type="range" min={12} max={totalNodes} step={1} value={Math.min(settings.nodeCap, totalNodes)} onChange={(e) => set("nodeCap", Number(e.target.value))} />
            </label>
            <div className={styles.row} role="radiogroup" aria-label="강조 색">
              <span>강조 색</span>
              <span className={styles.swatches}>
                {ACCENTS.map((a) => (
                  <label key={a.value} className={styles.swatch} style={{ background: a.value }} title={a.name}>
                    <input type="radio" name={`${uid}-accent`} value={a.value} checked={settings.accent === a.value} onChange={() => set("accent", a.value)} />
                    <span className="sr-only">{a.name}</span>
                  </label>
                ))}
              </span>
            </div>
            {(
              [
                ["labels", "라벨 표시"],
                ["flow", "간선 flow dots"],
                ["autoRotate", "자동 회전"],
                ["simulate", "레이아웃 시뮬레이션 실행"],
                ["paused", "렌더링 일시정지"],
              ] as const
            ).map(([key, text]) => (
              <label key={key} className={styles.check}>
                <input type="checkbox" checked={settings[key]} onChange={(e) => set(key, e.target.checked)} />
                {text}
              </label>
            ))}
            <button type="button" className={styles.tbtn} onClick={() => setSettings(DEFAULT_SETTINGS)}>설정 초기화</button>
          </fieldset>

          <div className={styles.group}>
            <label htmlFor={`${uid}-q`}>노드 검색</label>
            <input id={`${uid}-q`} type="search" className={styles.search} placeholder="예: LLM, 웹" value={query} onChange={(e) => setQuery(e.target.value)} />
            <ul className={styles.list} aria-label="노드 목록">
              {filtered.map((nd) => (
                <li key={nd.id}>
                  <button type="button" className={styles.item} aria-pressed={state.selectedId === nd.id} disabled={!interactive} onClick={() => (state.selectedId === nd.id ? actions.clear() : actions.select(nd.id))}>
                    {nd.label}
                    <small>{GROUP_NAMES[nd.group] ?? nd.group}</small>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className={styles.empty}>검색 결과가 없습니다.</li>}
            </ul>
            {selected && (
              <p className={styles.info}>
                <strong>{selected.label}</strong> 이웃 {neighbors.length}개: {neighbors.map((nb) => nb?.label).join(", ")}
              </p>
            )}
          </div>

          <div className={styles.group}>
            <p className={styles.h}>7가지 인터랙션 가이드</p>
            <ol className={styles.guide}>
              {INTERACTIONS.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <p className={styles.h}>키보드</p>
            <p className={styles.guideP}>Tab: 버튼·노드 목록 이동 · Enter/Space: 선택 · Esc: 선택 해제</p>
          </div>

          <p className={styles.stats} aria-label="성능 정보">
            품질 {tier}{reducedMotion ? " · 모션 감소" : ""} · 노드 {stats?.nodes ?? model.n} / 간선 {stats?.edges ?? model.m}
            {stats ? ` · ${stats.fps}fps · draw ${stats.drawCalls} · 시뮬레이션 ${stats.simRunning ? "동작" : "정지"}` : ""}
          </p>
        </div>
      </details>
    </section>
  );
}
