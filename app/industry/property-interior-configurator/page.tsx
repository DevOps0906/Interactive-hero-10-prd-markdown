import type { Metadata } from "next";
import InteriorSpaceConfiguratorHero from "@/components/industry/InteriorSpaceConfigurator/InteriorSpaceConfiguratorHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("property-interior-configurator");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <InteriorSpaceConfiguratorHero />;
}
