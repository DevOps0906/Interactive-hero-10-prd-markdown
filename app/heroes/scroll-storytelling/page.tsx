import type { Metadata } from "next";
import ScrollStorytellingHero from "@/components/heroes/ScrollStorytelling/ScrollStorytellingHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("scroll-storytelling");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <ScrollStorytellingHero />;
}
