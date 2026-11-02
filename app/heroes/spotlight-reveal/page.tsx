import type { Metadata } from "next";
import SpotlightRevealHero from "@/components/heroes/SpotlightReveal/SpotlightRevealHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("spotlight-reveal");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <SpotlightRevealHero />;
}
