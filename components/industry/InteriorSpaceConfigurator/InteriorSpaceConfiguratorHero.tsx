"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";
import Controls, { BottomSheet, goTo } from "./Controls";
import Overlay from "./Overlay";
import { configId, track } from "./logic";
import { useConfigurator } from "./useConfigurator";
import styles from "./InteriorSpaceConfigurator.module.css";

// 3D 장면은 클라이언트 전용으로 지연 로딩한다
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const hero = getIndustryHero("property-interior-configurator");
const POSTER = "/posters/property-interior-configurator/poster.svg";

export default function InteriorSpaceConfiguratorHero() {
  const { state, actions, reduced, tier } = useConfigurator();
  const fallback = state.phase === "fallback";

  useEffect(() => {
    track("hero_view");
  }, []);

  return (
    <div className={styles.root}>
      <HeroSlot
        hero={hero}
        cta={
          <>
            <a
              href="#ic-panel"
              className={`btn-primary ${styles.cta}`}
              onClick={(e) => {
                e.preventDefault();
                track("hero_cta_click", { cta: "start" });
                goTo("ic-panel", reduced);
              }}
            >
              공간 꾸미기 시작
            </a>
            <a
              href="#ic-quote"
              className={styles.ctaGhost}
              onClick={(e) => {
                e.preventDefault();
                track("hero_cta_click", { cta: "quote", configId: configId(state.config) });
                goTo("ic-quote-title", reduced);
              }}
            >
              구성 저장 · 견적 요청
            </a>
            <p>데모 화면입니다. 가격·치수는 예시이며 실제 견적·실측과 다릅니다.</p>
          </>
        }
        overlay={<Overlay state={state} actions={actions} />}
        panel={
          <>
            <Controls state={state} actions={actions} reduced={reduced} />
            <BottomSheet state={state} reduced={reduced} />
          </>
        }
      >
        <div className={styles.stage}>
          {state.phase !== "ready" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.poster} src={POSTER} alt="" width={960} height={600} fetchPriority="high" />
          )}
          {!fallback && <Scene state={state} actions={actions} reduced={reduced} tier={tier} />}
        </div>
      </HeroSlot>
    </div>
  );
}
