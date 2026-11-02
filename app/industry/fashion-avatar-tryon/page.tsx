import type { Metadata } from "next";
import FashionAvatarLookbookHero from "@/components/industry/FashionAvatarLookbook/FashionAvatarLookbookHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("fashion-avatar-tryon");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <FashionAvatarLookbookHero />;
}
