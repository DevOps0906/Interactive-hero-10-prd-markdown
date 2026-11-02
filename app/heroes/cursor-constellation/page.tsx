import type { Metadata } from "next";
import CursorConstellationHero from "@/components/heroes/CursorConstellation/CursorConstellationHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("cursor-constellation");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <CursorConstellationHero />;
}
