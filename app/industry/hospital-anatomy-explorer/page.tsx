import type { Metadata } from "next";
import AnatomyCareExplorerHero from "@/components/industry/AnatomyCareExplorer/AnatomyCareExplorerHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("hospital-anatomy-explorer");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <AnatomyCareExplorerHero />;
}
