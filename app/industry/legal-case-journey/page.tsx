import type { Metadata } from "next";
import LegalCaseJourneyHero from "@/components/industry/LegalCaseJourney/LegalCaseJourneyHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("legal-case-journey");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <LegalCaseJourneyHero />;
}
