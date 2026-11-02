import type { ReactNode } from "react";
import type { HeroMeta } from "@/lib/hero/registry";

// 히어로 슬롯 계약: 제목·설명·CTA는 HTML, 효과 캔버스(children)는 aria-hidden 스테이지에 넣는다.
export function HeroSlot({ hero, children }: { hero: HeroMeta; children?: ReactNode }) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-stage" aria-hidden="true">
        {children ?? "히어로 효과 자리 (placeholder)"}
      </div>
      <div className="hero-text">
        <span className="kicker">{hero.no} / 10</span>
        <h1 id="hero-title">{hero.title}</h1>
        <p>{hero.description}</p>
      </div>
    </section>
  );
}
