"use client";

import { useRef, useState } from "react";
import { CAMERA_SHOTS, DEMO_LABEL, SIZE_TABLE, SLOTS, SLOT_LABEL, formatKRW, itemsOf, lookLines, swatchOf } from "./config";
import type { SizeId, SlotId } from "./types";
import type { LookbookActions, LookbookState } from "./useLookbook";
import type { TrackFn } from "./analytics";
import styles from "./FashionAvatarLookbook.module.css";

export interface CartConfirm {
  look: LookbookState["look"];
  count: number;
  total: number;
  size: SizeId;
}

interface ControlsProps {
  state: LookbookState;
  actions: LookbookActions;
  reduced: boolean;
  cart: CartConfirm | null;
  onAddToCart: () => void;
  track: TrackFn;
}

const SIZES = SIZE_TABLE.map((r) => r.size);

/** 슬롯별 의상 선택 + 원단/색상 스와치. 선택 상태는 색뿐 아니라 텍스트("선택됨")로도 보인다. */
function SlotGroup({ slot, state, actions, track }: { slot: SlotId; state: LookbookState; actions: LookbookActions; track: TrackFn }) {
  const items = itemsOf(slot);
  const currentId = state.look[slot];
  const current = items.find((i) => i.id === currentId);
  return (
    <fieldset className={styles.group} data-active={state.selectedId === slot}>
      <legend>{SLOT_LABEL[slot]}</legend>
      <ul className={styles.options}>
        {slot === "outer" && (
          <li>
            <button
              type="button"
              className={`${styles.btn} ${styles.option}`}
              aria-pressed={currentId === null}
              onClick={() => {
                actions.setItem(slot, null);
                track("hero_select", { slot, item: "none" });
              }}
            >
              <span className={styles.optName}>
                <span>착용 안 함</span>
              </span>
              {currentId === null && <span className={styles.state}>선택됨</span>}
            </button>
          </li>
        )}
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.btn} ${styles.option}`}
              aria-pressed={currentId === item.id}
              data-item={item.id}
              onClick={() => {
                actions.setItem(slot, item.id);
                track("hero_select", { slot, item: item.id });
              }}
            >
              <span className={styles.optName}>
                <span>{item.name}</span>
                <span className={styles.optPrice}>{formatKRW(item.price)}</span>
              </span>
              {currentId === item.id && <span className={styles.state}>선택됨</span>}
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <>
          <p className={styles.muted} style={{ marginTop: 0, marginBottom: 8 }}>
            원단·색상: {swatchOf(current, state.look.swatch[slot]).fabric} / {swatchOf(current, state.look.swatch[slot]).name}
          </p>
          <ul className={styles.swatches} aria-label={`${SLOT_LABEL[slot]} 색상`}>
            {current.swatches.map((sw) => (
              <li key={sw.id}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.swatch}`}
                  aria-pressed={state.look.swatch[slot] === sw.id}
                  onClick={() => {
                    actions.setSwatch(slot, sw.id);
                    track("hero_select", { slot, swatch: sw.id });
                  }}
                >
                  <span className={styles.chip} style={{ background: sw.color }} aria-hidden="true" />
                  <span>{sw.name}</span>
                  {state.look.swatch[slot] === sw.id && <span className={styles.state}>선택됨</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.muted}>선택한 아이템이 없습니다.</p>
      )}
    </fieldset>
  );
}

export default function Controls({ state, actions, reduced, cart, onAddToCart, track }: ControlsProps) {
  const lines = lookLines(state.look);
  const total = lines.reduce((s, l) => s + l.price, 0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const shot = CAMERA_SHOTS.find((s) => s.id === state.viewMode);

  const openGuide = () => {
    dialogRef.current?.showModal();
    track("hero_interact", { control: "size_guide" });
  };
  const closeGuide = () => dialogRef.current?.close();

  return (
    <section className={styles.panel} aria-labelledby="fal-panel-title" id="lookbook-panel">
      <div className={styles.panelHead}>
        <h2 id="fal-panel-title">
          코디 컨트롤<span className={styles.badge}>{DEMO_LABEL}</span>
        </h2>
        <div className={styles.headActions}>
          <button type="button" className={styles.btn} onClick={actions.undo} disabled={state.history.length === 0}>
            되돌리기
          </button>
          <button type="button" className={styles.btn} onClick={actions.resetLook}>
            초기화
          </button>
        </div>
      </div>
      <p className={styles.muted} role="status" aria-live="polite" style={{ marginTop: 0, marginBottom: 16 }}>
        {state.isAnimating ? "의상을 갈아입히는 중…" : `현재 ${lines.map((l) => `${SLOT_LABEL[l.slot]} ${l.item.name}(${l.swatch.name})`).join(" · ")}`}
      </p>

      <div className={styles.grid}>
        {SLOTS.map((slot) => (
          <SlotGroup key={slot} slot={slot} state={state} actions={actions} track={track} />
        ))}

        <fieldset className={styles.group}>
          <legend>카메라·회전</legend>
          <div className={styles.row} role="group" aria-label="카메라 샷">
            {CAMERA_SHOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.btn}
                aria-pressed={state.viewMode === s.id}
                onClick={() => {
                  actions.setShot(s.id);
                  track("hero_interact", { control: "shot", shot: s.id });
                }}
              >
                {s.label}
                {state.viewMode === s.id ? " (선택됨)" : ""}
              </button>
            ))}
          </div>
          <div className={styles.row} role="group" aria-label="아바타 회전">
            <button type="button" className={styles.btn} onClick={() => actions.turn("nudge", -Math.PI / 4)}>
              ◀ 왼쪽 45°
            </button>
            <button type="button" className={styles.btn} onClick={() => actions.turn("nudge", Math.PI / 4)}>
              오른쪽 45° ▶
            </button>
            <button type="button" className={styles.btn} onClick={() => actions.turn("face", 0)}>
              앞면
            </button>
            <button type="button" className={styles.btn} onClick={() => actions.turn("face", Math.PI)}>
              뒷면
            </button>
          </div>
          <label className={styles.check}>
            <input type="checkbox" checked={state.turntable && !reduced} disabled={reduced} onChange={(e) => actions.setTurntable(e.target.checked)} />
            <span>턴테이블 자동 회전: {state.turntable && !reduced ? "켜짐" : "꺼짐"}</span>
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={state.clothMotion && !reduced} disabled={reduced} onChange={(e) => actions.setCloth(e.target.checked)} />
            <span>천 움직임 근사: {state.clothMotion && !reduced ? "켜짐" : "꺼짐"}</span>
          </label>
          <p className={styles.muted}>
            현재 시점: {shot?.desc}. 천 움직임은 가벼운 리깅 흔들림 근사이며 실제 천 시뮬레이션과 다릅니다.
            {reduced ? " (모션 감소 설정으로 자동 회전·흔들림이 꺼져 있습니다.)" : ""}
          </p>
        </fieldset>

        <fieldset className={styles.group}>
          <legend>사이즈 가이드</legend>
          <p style={{ margin: "0 0 12px" }}>선택 사이즈: <strong>{state.size}</strong></p>
          <button ref={openerRef} type="button" className={styles.btn} onClick={openGuide} aria-haspopup="dialog">
            사이즈 표·실측 보기
          </button>
          <p className={styles.muted}>3D 착용 이미지는 실제 핏을 보증하지 않습니다. 아바타 체형은 중립이며 신체 치수를 추정하지 않습니다.</p>
        </fieldset>

        <fieldset className={`${styles.group} ${styles.wide}`} aria-labelledby="fal-shop-title">
          <legend id="fal-shop-title">SHOP THE LOOK</legend>
          {lines.length === 0 ? (
            <p>선택한 상품이 없습니다.</p>
          ) : (
            <ul className={styles.lines}>
              {lines.map((l) => (
                <li key={l.slot} className={styles.line}>
                  <div className={styles.lineTop}>
                    <span>
                      <strong>{SLOT_LABEL[l.slot]}</strong> · {l.item.name}
                    </span>
                    <span className={styles.optPrice}>{formatKRW(l.price)}</span>
                  </div>
                  <span className={styles.muted} style={{ margin: 0 }}>
                    SKU {l.sku} · {l.swatch.fabric} / {l.swatch.name} · 사이즈 {state.size}
                  </span>
                  <details>
                    <summary>상품 상세 ({DEMO_LABEL})</summary>
                    <p style={{ margin: "4px 0 0" }}>
                      {l.item.name} · {l.swatch.fabric} · {l.swatch.name}. 가격과 SKU는 데모 mockData이며 실제 상품 정보가 아닙니다.
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.total}>
            <span>합계 ({DEMO_LABEL})</span>
            <span>{formatKRW(total)}</span>
          </div>
          <button type="button" className="btn-primary" onClick={onAddToCart} disabled={lines.length === 0}>
            코디 전체 장바구니 담기
          </button>
          {cart && cart.look === state.look && (
            <p className={styles.confirm} role="status">
              데모 확인: {cart.count}개 상품(사이즈 {cart.size}, 합계 {formatKRW(cart.total)})을 담았습니다. 실제 주문·저장·전송은 이루어지지 않습니다.
            </p>
          )}
        </fieldset>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="fal-size-title"
        onClose={() => openerRef.current?.focus()}
      >
        <h3 id="fal-size-title">
          사이즈 가이드<span className={styles.badge}>{DEMO_LABEL}</span>
        </h3>
        <table className={styles.table}>
          <caption className={styles.muted} style={{ textAlign: "left" }}>상의 기준 실측(cm, 데모 예시)</caption>
          <thead>
            <tr>
              <th scope="col">사이즈</th>
              <th scope="col">가슴단면</th>
              <th scope="col">허리단면</th>
              <th scope="col">총장</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_TABLE.map((r) => (
              <tr key={r.size} data-current={state.size === r.size}>
                <th scope="row">
                  {r.size}
                  {state.size === r.size ? " (선택됨)" : ""}
                </th>
                <td>{r.chest}</td>
                <td>{r.waist}</td>
                <td>{r.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.row} role="group" aria-label="사이즈 선택">
          {SIZES.map((s) => (
            <button key={s} type="button" className={styles.btn} aria-pressed={state.size === s} onClick={() => actions.setSize(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className={styles.notice}>3D 시착은 참고용이며 정확한 피팅을 보증하지 않습니다. 실측치는 데모 예시입니다.</p>
        <button type="button" className="btn-primary" onClick={closeGuide}>
          닫기
        </button>
      </dialog>

      {/* 모바일 바텀시트: 현재 코디 요약 + 구매 CTA (~767에서만 표시) */}
      <div className={styles.sheet} role="region" aria-label="현재 코디 요약">
        <div className={styles.sheetBar}>
          <button type="button" className={styles.btn} aria-expanded={sheetOpen} aria-controls="fal-sheet-body" onClick={() => setSheetOpen((v) => !v)}>
            {sheetOpen ? "접기" : `코디 ${lines.length}점`}
          </button>
          <strong>{formatKRW(total)}</strong>
          <button type="button" className="btn-primary" onClick={onAddToCart} disabled={lines.length === 0}>
            담기
          </button>
        </div>
        {cart && cart.look === state.look && (
          <p className={styles.muted} role="status">
            데모: {cart.count}개 담음 (실제 주문 아님)
          </p>
        )}
        {sheetOpen && (
          <div id="fal-sheet-body" className={styles.sheetBody}>
            <ul>
              {lines.map((l) => (
                <li key={l.slot}>
                  <span>
                    {l.item.name} ({l.swatch.name})
                  </span>
                  <span>{formatKRW(l.price)}</span>
                </li>
              ))}
            </ul>
            <p className={styles.muted}>{DEMO_LABEL} 가격 · 사이즈 {state.size}</p>
          </div>
        )}
      </div>
    </section>
  );
}
