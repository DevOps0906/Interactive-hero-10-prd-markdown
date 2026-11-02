import type { Metadata } from "next";
import KineticTypeHero from "@/components/heroes/KineticType/KineticTypeHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("kinetic-type");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <KineticTypeHero />;
}
