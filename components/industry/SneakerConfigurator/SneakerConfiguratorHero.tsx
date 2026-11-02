"use client";

import { useEffect, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import { detectQualityTier, prefersReducedMotion, subscribeReducedMotion, type QualityTier } from "@/lib/hero/performance";
import { track } from "./analytics";
import { MATERIALS, STATUS_LABEL, resolveVariant, won } from "./config";
import StaticShoe from "./StaticShoe";
import { ColorPicker, MaterialPicker, Toolbar } from "./Controls";
import Panel from "./Panel";
import { useConfigurator } from "./useConfigurator";
import styles from "./SneakerConfigurator.module.css";

const hero = getIndustryHero("sneaker-customizer");
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const TIER_RANK: Record<QualityTier, number> = { low: 0, medium: 1, high: 2 };
const noopSubscribe = () => () => {};
const POSTER = "/posters/sneaker-customizer/poster.svg";

export default function SneakerConfiguratorHero() {
  const { state, actions } = useConfigurator();
  const reduced = useSyncExternalStore(
    (cb) => subscribeReducedMotion(cb),
    prefersReducedMotion,
    () => false,
  );
  const baseTier = useSyncExternalStore(noopSubscribe, detectQualityTier, () => "medium" as QualityTier);
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const tier = state.tierCap && TIER_RANK[state.tierCap] < TIER_RANK[baseTier] ? state.tierCap : baseTier;

  useEffect(() => {
    track("hero_view");
  }, []);

  const v = resolveVariant(state.config);
  const blocked = v.stock <= 0;
  const count = state.cart.reduce((n, l) => n + l.qty, 0);
  const show3d = mounted && state.phase !== "fallback" && !state.staticMode;
  const loading = state.phase === "loading";

  const cta = (
    <>
      <button type="button" className="btn-primary" aria-disabled={blocked || state.pending} onClick={actions.addToCart}>
        {state.pending ? "담는 중…" : `이 옵션 담기 · ${won(v.price)}`}
      </button>
      <a className="btn-ghost" href="#sneaker-options">
        옵션·사이즈 보기
      </a>
      <p>
        선택: {MATERIALS[state.config.material].label} · {state.config.size}mm ·{" "}
        {STATUS_LABEL[v.status]} · 장바구니 {count}개 · 가격은 데모 예시
      </p>
    </>
  );

  const overlay = (
    <div className={styles.overlay}>
      <div className={styles.top}>
        <Toolbar state={state} actions={actions} />
      </div>

      {loading && show3d ? (
        <p className={styles.loading} role="status">
          3D 모델을 불러오는 중… (포스터 표시 중)
        </p>
      ) : null}

      {state.phase === "fallback" || state.staticMode ? (
        <div className={styles.fallbackMsg} role="status">
          <p>
            {state.phase === "fallback"
              ? `3D를 표시할 수 없어 정지 이미지로 대체했습니다${state.error ? ` (${state.error})` : ""}. 아래 옵션으로 그대로 주문할 수 있습니다.`
              : "정적 이미지 모드입니다. 옵션 선택과 주문은 그대로 동작합니다."}
          </p>
          {state.phase === "fallback" ? (
            <button type="button" className={styles.chip} onClick={actions.retry}>
              3D 다시 시도
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={styles.bottom}>
        <p className={styles.hint}>드래그로 돌려 보기 · 세로 스크롤은 그대로 동작합니다{reduced ? " · 모션 감소 설정: 애니메이션 없음" : ""}</p>
        <div className={styles.dock}>
          <ColorPicker state={state} actions={actions} prefix="dock" />
          <MaterialPicker state={state} actions={actions} prefix="dock" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.root}>
      <HeroSlot hero={hero} kicker={`${hero.no} / 10 · DEMO`} cta={cta} overlay={overlay} panel={<Panel state={state} actions={actions} />}>
        <div className={styles.stage} data-animating={state.isAnimating || undefined} data-view={state.viewMode} data-selected={state.selectedId}>
          {show3d ? <Scene state={state} actions={actions} reduced={reduced} tier={tier} /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {!mounted || (show3d && loading) ? <img className={styles.poster} src={POSTER} alt="" width={640} height={480} /> : null}
          {mounted && !show3d ? <StaticShoe config={state.config} /> : null}
        </div>
      </HeroSlot>
    </div>
  );
}
