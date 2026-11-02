"use client";

import { HeroSlot } from "@/components/shell/HeroSlot";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("academy-robot-lab");

export default function RobotLearningLabHero() {
  return <HeroSlot hero={hero} />;
}
