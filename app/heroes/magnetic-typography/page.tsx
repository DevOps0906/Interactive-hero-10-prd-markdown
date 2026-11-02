import type { Metadata } from "next";
import MagneticTypographyHero from "@/components/heroes/MagneticTypography/MagneticTypographyHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("magnetic-typography");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <MagneticTypographyHero />;
}
