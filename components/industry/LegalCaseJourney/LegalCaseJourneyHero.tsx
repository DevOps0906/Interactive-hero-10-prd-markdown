"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("legal-case-journey");

export default function LegalCaseJourneyHero() {
  return <HeroSlot hero={hero} />;
}
