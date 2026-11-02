"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_LABEL, FLOORS, HOTSPOTS, MATERIALS, TIMES, TOUR_STEPS } from "./config";
import FloorPlan from "./FloorPlan";
import { trackEvent, type BlueprintActions, type BlueprintState } from "./useBlueprint";
import styles from "./ArchitectureBlueprintReveal.module.css";

interface Props {
  state: BlueprintState;
  actions: BlueprintActions;
  onInquiry: () => void;
}

/** 스테이지 위 비장식 UI: 도구 막대 · 상태 · 요약 패널(모바일은 바텀시트) · 투어 자막 */
export default function Overlay({ state, actions, onInquiry }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [note, setNote] = useState("");
  const { phase, selectedId, hotspotId, tourStep, config } = state;
  const floor = FLOORS.find((f) => f.id === selectedId) ?? null;
  const spot = HOTSPOTS.find((h) => h.id === hotspotId) ?? null;
  const open = floor !== null || spot !== null;
  const interactive = phase === "ready";
  const material = MATERIALS.find((m) => m.id === (config.compare ? config.prevMaterial : config.material));
  const time = TIMES.find((t) => t.id === config.time);

  // 핫스팟 선택 → 설명 카드로 포커스 이동(닫으면 이전 요소로 복귀)
  const { focusN } = state;
  useEffect(() => {
    if (focusN === 0) return;
    returnFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    sheetRef.current?.focus();
  }, [focusN]);

  const close = useCallback(() => {
    if (spot) actions.hotspot(null);
    if (floor) actions.select(floor.id);
    const back = returnFocus.current;
    returnFocus.current = null;
    if (back?.isConnected) back.focus();
  }, [spot, floor, actions]);

  // ESC: 요약 닫기 → 투어 종료
  useEffect(() => {
    if (!open && tourStep < 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) close();
      else actions.tourStop();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, tourStep, close, actions]);

  const say = (m: string) => {
    setNote(m);
    window.setTimeout(() => setNote(""), 3500);
  };
  const fullscreen = () => {
    const box = rootRef.current?.closest(".hero-stagebox") as HTMLElement | null;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else if (box?.requestFullscreen) box.requestFullscreen().catch(() => say("전체화면을 열 수 없습니다."));
    else say("이 브라우저는 전체화면을 지원하지 않습니다.");
  };

  const status =
    phase === "fallback"
      ? "3D 화면을 표시할 수 없어 도면으로 대체했습니다."
      : phase !== "ready"
        ? "도면을 그리는 중입니다. 곧 3D 건축물로 전환됩니다."
        : `3D 모델 표시 중 · 선택: ${floor ? floor.label : "없음"} · 재질: ${material?.label}${config.compare ? "(이전 재질 비교)" : ""} · 시간대: ${time?.label} · ${state.isAnimating ? "이동 중" : "대기"}`;

  const step = tourStep >= 0 ? TOUR_STEPS[Math.min(tourStep, TOUR_STEPS.length - 1)] : null;

  return (
    <div ref={rootRef} className={styles.overlay}>
      <div className={styles.toolbar} role="toolbar" aria-label="3D 보기 도구">
        <button type="button" className={styles.tool} onClick={actions.home} disabled={!interactive}>
          초기 뷰
        </button>
        <button type="button" className={styles.tool} onClick={actions.undo} disabled={!interactive || state.history.length === 0}>
          되돌리기
        </button>
        <button type="button" className={styles.tool} onClick={actions.reset} disabled={!interactive}>
          초기화
        </button>
        <button type="button" className={styles.tool} onClick={actions.replay} disabled={!interactive}>
          도면 다시 보기
        </button>
        <button type="button" className={styles.tool} onClick={fullscreen}>
          전체화면
        </button>
      </div>

      <p className={styles.status} role="status" aria-live="polite">
        {note || status}
      </p>

      {step && (
        <div className={styles.tourCaption} role="group" aria-label="카메라 투어">
          <strong>
            {tourStep < 3 ? `${tourStep + 1}/3 ${step.label}` : "투어 완료"}
          </strong>
          <span>{tourStep < 3 ? step.text : "마음에 드는 방향이 있다면 프로젝트 상담을 문의해 보세요."}</span>
          <span className={styles.row}>
            {tourStep < 3 ? (
              <>
                <button type="button" className={styles.tool} onClick={() => actions.tour(tourStep - 1)} disabled={tourStep === 0}>
                  이전
                </button>
                <button type="button" className={styles.tool} onClick={() => actions.tour(tourStep + 1)}>
                  {tourStep === 2 ? "마치기" : "다음"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  trackEvent("hero_cta_click", { from: "tour_end" });
                  onInquiry();
                }}
              >
                상담 프로젝트 문의
              </button>
            )}
            <button type="button" className={styles.tool} onClick={actions.tourStop}>
              투어 종료
            </button>
          </span>
        </div>
      )}

      {open && (
        <aside ref={sheetRef} className={styles.sheet} tabIndex={-1} aria-label="선택 요약">
          <div className={styles.sheetHead}>
            <span className={styles.sheetGrip} aria-hidden="true" />
            <button type="button" className={styles.tool} onClick={close}>
              닫기 (Esc)
            </button>
          </div>
          {spot && (
            <section>
              <h3>{spot.title}</h3>
              <p>{spot.body}</p>
            </section>
          )}
          {floor && (
            <section>
              <h3>
                {floor.label} <span className={styles.demoTag}>{DEMO_LABEL}</span>
              </h3>
              <p>
                {floor.use} · 면적 {floor.area}㎡ ({DEMO_LABEL} 예시)
              </p>
              <FloorPlan floor={floor} />
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
