import type { Metadata } from "next";
import RealEstateUnitExplorerHero from "@/components/industry/RealEstateUnitExplorer/RealEstateUnitExplorerHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("realestate-unit-explorer");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <RealEstateUnitExplorerHero />;
}
