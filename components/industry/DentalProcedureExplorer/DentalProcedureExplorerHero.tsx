"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("clinic-dental-3d");

export default function DentalProcedureExplorerHero() {
  return <HeroSlot hero={hero} />;
}
