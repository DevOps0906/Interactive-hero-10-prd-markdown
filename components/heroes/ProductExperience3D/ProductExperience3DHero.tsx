"use client";

import type { CSSProperties } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";
import Controls from "./Controls";
import Scene from "./Scene";
import { DEFAULT_PRODUCT, type ProductData } from "./config";
import { useHeroInteraction } from "./useHeroInteraction";
import styles from "./ProductExperience3D.module.css";

/** product: 외부 데이터 주입 지점(미지정 시 기본 제품). */
export default function ProductExperience3DHero({ product = DEFAULT_PRODUCT }: { product?: ProductData }) {
  const { state, actions, reduced, tier, fpsRef } = useHeroInteraction(product.finishes[0]);
  const fallback = state.phase === "fallback";
  const loading = state.phase === "loading";

  const vars = { "--hero-speed": state.speed, "--hero-intensity": state.intensity, "--hero-accent": product.accent } as CSSProperties;

  return (
    <div className={styles.root} style={vars}>
      <HeroSlot
        hero={getHero("3d-product-experience")}
        panel={<Controls product={product} state={state} actions={actions} reduced={reduced} tier={tier} fpsRef={fpsRef} />}
      >
        <div className={styles.stage}>
          {fallback ? (
            <div className={styles.fallback}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/heroes/3d-product-experience/poster.svg" alt="" width={480} height={360} />
              <p>3D 화면을 표시할 수 없어 정지 이미지로 대체했습니다. 아래 옵션 패널에서 제품 정보를 확인하세요.</p>
            </div>
          ) : (
            <Scene state={state} actions={actions} reduced={reduced} tier={tier} fpsRef={fpsRef} product={product} />
          )}
          {loading && (
            <div className={styles.loading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>3D 모델 불러오는 중…</span>
            </div>
          )}
          <p className={styles.hint}>드래그로 회전 · 휠/핀치로 확대 · ↓ 아래에서 옵션 조절</p>
        </div>
      </HeroSlot>
    </div>
  );
}
