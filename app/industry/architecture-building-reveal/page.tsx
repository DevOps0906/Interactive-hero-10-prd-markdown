import type { Metadata } from "next";
import ArchitectureBlueprintRevealHero from "@/components/industry/ArchitectureBlueprintReveal/ArchitectureBlueprintRevealHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("architecture-building-reveal");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <ArchitectureBlueprintRevealHero />;
}
