"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("property-interior-configurator");

export default function InteriorSpaceConfiguratorHero() {
  return <HeroSlot hero={hero} />;
}
