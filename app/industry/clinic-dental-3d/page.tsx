import type { Metadata } from "next";
import DentalProcedureExplorerHero from "@/components/industry/DentalProcedureExplorer/DentalProcedureExplorerHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("clinic-dental-3d");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <DentalProcedureExplorerHero />;
}
