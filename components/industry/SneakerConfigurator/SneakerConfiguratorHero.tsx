"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("sneaker-customizer");

export default function SneakerConfiguratorHero() {
  return <HeroSlot hero={hero} />;
}
