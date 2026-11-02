import type { Metadata } from "next";
import VirtualCampusTourHero from "@/components/industry/VirtualCampusTour/VirtualCampusTourHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("academy-virtual-campus");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <VirtualCampusTourHero />;
}
