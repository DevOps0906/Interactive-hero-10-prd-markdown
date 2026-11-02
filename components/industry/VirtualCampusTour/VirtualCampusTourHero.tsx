"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("academy-virtual-campus");

export default function VirtualCampusTourHero() {
  return <HeroSlot hero={hero} />;
}
