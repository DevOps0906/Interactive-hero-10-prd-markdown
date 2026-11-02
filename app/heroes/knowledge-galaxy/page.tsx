import type { Metadata } from "next";
import KnowledgeGalaxyHero from "@/components/heroes/KnowledgeGalaxy/KnowledgeGalaxyHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("knowledge-galaxy");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <KnowledgeGalaxyHero />;
}
