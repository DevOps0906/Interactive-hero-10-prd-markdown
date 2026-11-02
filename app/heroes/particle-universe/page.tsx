import type { Metadata } from "next";
import ParticleUniverseHero from "@/components/heroes/ParticleUniverse/ParticleUniverseHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("particle-universe");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <ParticleUniverseHero />;
}
