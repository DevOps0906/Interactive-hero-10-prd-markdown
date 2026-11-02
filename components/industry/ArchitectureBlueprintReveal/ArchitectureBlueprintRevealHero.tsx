"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("architecture-building-reveal");

export default function ArchitectureBlueprintRevealHero() {
  return <HeroSlot hero={hero} />;
}
