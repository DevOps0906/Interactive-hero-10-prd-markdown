"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import { track } from "./analytics";
import { DEMO_LABEL, formatKRW, lookLines } from "./config";
import Controls, { type CartConfirm } from "./Controls";
import Overlay from "./Overlay";
import { useLookbook } from "./useLookbook";
import styles from "./FashionAvatarLookbook.module.css";

const hero = getIndustryHero("fashion-avatar-tryon");
const POSTER = "/posters/fashion-avatar-tryon/poster.svg";

// Three.js/R3F 는 클라이언트 전용으로 지연 로드한다.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

export default function FashionAvatarLookbookHero() {
  const { state, actions, reduced, tier } = useLookbook();
  const [cart, setCart] = useState<CartConfirm | null>(null);
  const lines = useMemo(() => lookLines(state.look), [state.look]);
  const total = lines.reduce((s, l) => s + l.price, 0);

  useEffect(() => {
    track("hero_view");
  }, []);

  // isAnimating 이 어떤 이유로든 남지 않도록 벽시계 데드라인으로 해제한다.
  const { animDone } = actions;
  useEffect(() => {
    if (!state.isAnimating) return;
    const id = window.setTimeout(() => animDone(state.animToken), 2500);
    return () => window.clearTimeout(id);
  }, [state.isAnimating, state.animToken, animDone]);

  const addToCart = useCallback(() => {
    if (lines.length === 0) return;
    track("hero_cta_click", { items: lines.length, total });
    setCart({ look: state.look, count: lines.length, total, size: state.size });
  }, [lines.length, total, state.look, state.size]);

  const showPoster = state.phase === "loading" || state.phase === "fallback";

  return (
    <div className={styles.root}>
      <HeroSlot
        hero={hero}
        kicker={`${hero.no} / 10 · ${DEMO_LABEL}`}
        cta={
          <>
            <button type="button" className="btn-primary" onClick={addToCart} disabled={lines.length === 0}>
              이 코디 장바구니 담기
            </button>
            <a href="#lookbook-panel" className={styles.btn} style={{ display: "inline-flex", alignItems: "center" }}>
              의상·색상 바꾸기
            </a>
            <p role="status" aria-live="polite">
              {cart && cart.look === state.look
                ? `데모: ${cart.count}개 담음 · ${formatKRW(cart.total)} (실제 주문 아님)`
                : `현재 코디 ${lines.length}점 · 합계 ${formatKRW(total)} (${DEMO_LABEL} 가격)`}
            </p>
          </>
        }
        overlay={<Overlay state={state} actions={actions} track={track} />}
        panel={<Controls state={state} actions={actions} reduced={reduced} cart={cart} onAddToCart={addToCart} track={track} />}
      >
        <div className={styles.stage}>
          {state.phase !== "fallback" && <Scene state={state} actions={actions} reduced={reduced} tier={tier} />}
          {showPoster && (
            <div className={state.phase === "fallback" ? styles.fallback : styles.poster}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={POSTER} alt="" width={320} height={420} />
              {state.phase === "fallback" ? (
                <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 패널에서 코디와 상품 정보를 그대로 확인할 수 있습니다.</p>
              ) : (
                <span className={styles.spinner} aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      </HeroSlot>
    </div>
  );
}
