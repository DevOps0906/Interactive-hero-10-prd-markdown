import type { Metadata } from "next";
import SneakerConfiguratorHero from "@/components/industry/SneakerConfigurator/SneakerConfiguratorHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("sneaker-customizer");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <SneakerConfiguratorHero />;
}
