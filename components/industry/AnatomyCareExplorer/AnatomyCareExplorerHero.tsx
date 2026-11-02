"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("hospital-anatomy-explorer");

export default function AnatomyCareExplorerHero() {
  return <HeroSlot hero={hero} />;
}
