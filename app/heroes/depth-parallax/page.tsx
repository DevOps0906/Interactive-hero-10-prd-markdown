import type { Metadata } from "next";
import DepthParallaxHero from "@/components/heroes/DepthParallax/DepthParallaxHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("depth-parallax");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <DepthParallaxHero />;
}
