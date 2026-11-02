"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getHero } from "@/lib/hero/registry";

// placeholder — 히어로 효과는 PRD 단계(P1~)에서 이 파일을 채운다.
export default function DepthParallaxHero() {
  return <HeroSlot hero={getHero("depth-parallax")} />;
}
