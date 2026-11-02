import { redirect } from "next/navigation";
import { HEROES, heroHref } from "@/lib/hero/registry";

export default function Home() {
  redirect(heroHref(HEROES[0].slug));
}
