"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("realestate-unit-explorer");

export default function RealEstateUnitExplorerHero() {
  return <HeroSlot hero={hero} />;
}
