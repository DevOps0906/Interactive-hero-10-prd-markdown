import type { Metadata } from "next";
import LiquidMorphingHero from "@/components/heroes/LiquidMorphing/LiquidMorphingHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("liquid-morphing");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <LiquidMorphingHero />;
}
