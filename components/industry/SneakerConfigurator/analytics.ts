export type HeroEventName = "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit";

/** 측정 이벤트. 개인정보는 싣지 않는다(옵션 id 와 SKU 만). 수신: window.addEventListener("hero:event", …) */
export function track(name: HeroEventName, detail: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, hero: "sneaker-customizer", ...detail } }));
}
