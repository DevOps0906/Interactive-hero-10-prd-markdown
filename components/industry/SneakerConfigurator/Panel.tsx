"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { MATERIALS, PARTS, STATUS_LABEL, colorOf, resolveVariant, won } from "./config";
import { ColorPicker, MaterialPicker, SizePicker } from "./Controls";
import type { Actions, State } from "./useConfigurator";
import styles from "./SneakerConfigurator.module.css";

/**
 * 선택 요약·옵션·장바구니 시트. 모바일(<768)에서는 화면 아래에 붙는 바텀시트(접기/펼치기, ESC 닫기),
 * 768 이상에서는 히어로 아래 일반 패널이다.
 */
export default function Panel({ state, actions }: { state: State; actions: Actions }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const { config } = state;
  const v = resolveVariant(config);
  const m = MATERIALS[config.material];
  const blocked = v.stock <= 0;
  const count = state.cart.reduce((n, l) => n + l.qty, 0);
  const total = state.cart.reduce((n, l) => n + l.qty * l.price, 0);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      toggle.current?.focus();
    }
  };

  return (
    <aside id="sneaker-options" className={styles.sheet} data-open={open} aria-labelledby="sneaker-sheet-title" onKeyDown={onKey}>
      <div className={styles.sheetBar}>
        <div className={styles.sheetSummary}>
          <h2 id="sneaker-sheet-title">내 스니커즈</h2>
          <p>
            <b>{won(v.price)}</b> <span className={styles.muted}>데모 예시</span> · {m.label} · {config.size}mm ·{" "}
            <span data-status={v.status} className={styles.stock}>
              {STATUS_LABEL[v.status]}
            </span>
          </p>
        </div>
        <button
          ref={toggle}
          type="button"
          className={`${styles.chip} ${styles.sheetToggle}`}
          aria-expanded={open}
          aria-controls="sneaker-sheet-body"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "옵션 닫기" : "옵션 열기"}
        </button>
        <button type="button" className="btn-primary" aria-disabled={blocked || state.pending} onClick={actions.addToCart}>
          {state.pending ? "담는 중…" : "장바구니 담기"}
        </button>
      </div>

      <p className={styles.notice} role="status" aria-live="polite" data-kind={state.notice?.kind}>
        {state.notice?.text ?? (blocked ? (v.reason ?? "") : "")}
      </p>

      <div id="sneaker-sheet-body" className={styles.sheetBody} data-open={open}>
        <div className={styles.mobileOnly}>
          <ColorPicker state={state} actions={actions} prefix="sheet" />
          <MaterialPicker state={state} actions={actions} prefix="sheet" />
        </div>
        <SizePicker state={state} actions={actions} prefix="sheet" />

        <section className={styles.group} aria-labelledby="sneaker-sum-title">
          <h3 id="sneaker-sum-title">선택 요약</h3>
          <dl className={styles.dl}>
            <dt>SKU</dt>
            <dd>{v.sku}</dd>
            {PARTS.map((p) => (
              <div key={p.id} className={styles.dlRow}>
                <dt>{p.label}</dt>
                <dd>{colorOf(config.colors[p.id]).name}</dd>
              </div>
            ))}
            <dt>소재</dt>
            <dd>{m.label}</dd>
            <dt>재고</dt>
            <dd>
              {STATUS_LABEL[v.status]} {v.stock > 0 ? `(${v.stock}개, 데모)` : ""}
            </dd>
          </dl>
          {blocked ? <p className={styles.errorText}>{v.reason} 다른 사이즈나 색을 선택해 주세요.</p> : null}
        </section>

        <section className={styles.group} aria-labelledby="sneaker-cart-title">
          <h3 id="sneaker-cart-title">장바구니 (DEMO) · {count}개</h3>
          {state.cart.length === 0 ? (
            <p className={styles.muted}>아직 담긴 상품이 없습니다. 이 목록은 새로고침하면 사라지며 어디에도 저장·전송되지 않습니다.</p>
          ) : (
            <>
              <ul className={styles.cart}>
                {state.cart.map((l) => (
                  <li key={l.sku}>
                    <span>
                      <b>{l.sku}</b>
                      <br />
                      <span className={styles.muted}>
                        {l.label} · {l.size}mm · {won(l.price)} × {l.qty}
                      </span>
                    </span>
                    <button type="button" className={styles.chip} onClick={() => actions.removeLine(l.sku)} aria-label={`${l.sku} 빼기`}>
                      빼기
                    </button>
                  </li>
                ))}
              </ul>
              <div className={styles.checkout}>
                <span>
                  합계 <b>{won(total)}</b> <span className={styles.muted}>데모 예시</span>
                </span>
                <button type="button" className="btn-primary" disabled={state.checkedOut} onClick={actions.checkout}>
                  {state.checkedOut ? "데모 주문 접수됨" : "구매하기 (데모)"}
                </button>
              </div>
            </>
          )}
        </section>
        <p className={styles.fine}>가격·재고·SKU는 모두 데모용 예시 데이터이며 실제 판매 정보가 아닙니다. 개인정보는 수집하지 않습니다.</p>
      </div>
    </aside>
  );
}
