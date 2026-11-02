import type { Metadata } from "next";
import ProductExperience3DHero from "@/components/heroes/ProductExperience3D/ProductExperience3DHero";
import { getHero } from "@/lib/hero/registry";

const hero = getHero("3d-product-experience");

export const metadata: Metadata = { title: hero.title, description: hero.description };

export default function Page() {
  return <ProductExperience3DHero />;
}
