import type { Metadata } from "next";
import RobotLearningLabHero from "@/components/industry/RobotLearningLab/RobotLearningLabHero";
import { getIndustryHero } from "@/lib/hero/registry";

const hero = getIndustryHero("academy-robot-lab");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <RobotLearningLabHero />;
}
