"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("fashion-avatar-tryon");

export default function FashionAvatarLookbookHero() {
  return <HeroSlot hero={hero} />;
}
