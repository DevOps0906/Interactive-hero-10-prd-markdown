import type { Metadata } from "next";
import ParticleUniverseHero from "@/components/heroes/ParticleUniverse/ParticleUniverseHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("particle-universe");

export const metadata: Metadata = {
  title: hero.title,
  description: `${hero.description} — Fibonacci 구가 나선·브랜드 마크로 변환되는 GPU 셰이더 파티클 히어로 데모`,
  openGraph: { title: hero.title, description: hero.description },
};

export default function Page() {
  return <ParticleUniverseHero />;
}
