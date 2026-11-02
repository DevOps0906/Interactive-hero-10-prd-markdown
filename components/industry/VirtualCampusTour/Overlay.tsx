"use client";

import type { RefObject } from "react";
import { DEMO_LABEL, VIEW_LABEL, track, type CampusData, type SpaceId } from "./config";
import type { TourActions, TourState } from "./useCampusTour";
import styles from "./VirtualCampusTour.module.css";

interface OverlayProps {
  data: CampusData;
  state: TourState;
  actions: TourActions;
  fullscreen: boolean;
  onFullscreen: () => void;
  overviewRef: RefObject<HTMLButtonElement | null>;
}

/** 스테이지 위 비장식 UI: 조작 툴바(되돌리기·초기화·전체화면 포함)와 선택 공간 요약/시간표 카드(모바일은 바텀시트). */
export default function Overlay({ data, state, actions, fullscreen, onFullscreen, overviewRef }: OverlayProps) {
  const { selectedId, viewMode, tourIndex, history, scheduleOpen, isAnimating } = state;
  const space = data.spaces.find((s) => s.id === selectedId);
  const touring = tourIndex >= 0;
  const order = data.spaces.map((s) => s.id);

  const step = (dir: 1 | -1) => {
    const i = selectedId ? order.indexOf(selectedId) : dir === 1 ? -1 : 0;
    actions.select(order[(i + dir + order.length) % order.length] as SpaceId);
  };
  const toBooking = () => {
    track("hero_cta_click", { cta: "visit_booking", from: "info_card" });
    const el = document.getElementById("campus-booking");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("booking-date")?.focus({ preventScroll: true }), 400);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.toolbar} role="toolbar" aria-label="캠퍼스 투어 조작">
        <button ref={overviewRef} type="button" className="btn-ghost" onClick={() => actions.select(null)} disabled={selectedId === null && !isAnimating}>캠퍼스 전경</button>
        <button type="button" className="btn-ghost" onClick={touring ? actions.stopTour : actions.startTour} aria-pressed={touring}>
          {touring ? "투어 정지" : "가이드 투어"}
        </button>
        <span className={styles.group} role="group" aria-label="탐색 모드">
          {(["orbit", "preset"] as const).map((m) => (
            <button key={m} type="button" className="btn-ghost" aria-pressed={viewMode === m} onClick={() => actions.setMode(m)}>
              {VIEW_LABEL[m]}
            </button>
          ))}
        </span>
        {viewMode === "preset" && (
          <span className={styles.group} role="group" aria-label="공간 이동">
            <button type="button" className="btn-ghost" onClick={() => step(-1)} aria-label="이전 공간">◀</button>
            <button type="button" className="btn-ghost" onClick={() => step(1)} aria-label="다음 공간">▶</button>
          </span>
        )}
        <button type="button" className="btn-ghost" onClick={actions.undo} disabled={history.length === 0}>되돌리기</button>
        <button type="button" className="btn-ghost" onClick={actions.reset}>초기화</button>
        <button type="button" className="btn-ghost" onClick={onFullscreen} aria-pressed={fullscreen}>{fullscreen ? "전체화면 종료" : "전체화면"}</button>
      </div>

      <div className={styles.card} data-empty={!space} role="region" aria-label="선택 공간 요약">
        {space ? (
          <>
            <div className={styles.cardHead}>
              <h2>{space.name}</h2>
              <button type="button" className="btn-ghost" onClick={() => actions.select(null)} aria-label="공간 선택 닫기 (Esc)">닫기</button>
            </div>
            <p className={styles.muted}>{space.kind} · 수용 {space.capacity}명 <span className={styles.demo}>{DEMO_LABEL}</span></p>
            <p>{space.summary}</p>
            <ul className={styles.chips}>
              {space.facilities.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <div className={styles.row}>
              <button type="button" className="btn-ghost" aria-expanded={scheduleOpen} aria-controls="schedule-region" onClick={actions.toggleSchedule}>
                {scheduleOpen ? "시간표 닫기" : "시간표 보기"}
              </button>
              <button type="button" className="btn-primary" onClick={toBooking}>이 공간으로 방문 예약</button>
            </div>
            {scheduleOpen && (
              <div id="schedule-region" className={styles.schedule}>
                <table>
                  <caption>{space.name} 시간표 ({DEMO_LABEL})</caption>
                  <thead>
                    <tr><th scope="col">요일</th><th scope="col">시간</th><th scope="col">내용</th></tr>
                  </thead>
                  <tbody>
                    {data.schedule[space.id].map((r) => (
                      <tr key={r.day + r.time}><td>{r.day}</td><td>{r.time}</td><td>{r.title}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className={styles.muted}>3D 공간을 누르거나 아래 목록에서 공간을 선택하면 설명이 여기에 표시됩니다.</p>
        )}
      </div>
    </div>
  );
}
