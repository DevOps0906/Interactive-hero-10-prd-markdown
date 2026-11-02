/** 측정 이벤트(PRD 7장). 개인정보는 싣지 않는다. 데모에서는 window 이벤트로만 발행하고 어디에도 전송·저장하지 않는다. */
export type HeroEventName = "hero_view" | "hero_interact" | "hero_select" | "hero_cta_click" | "lead_submit";
export type TrackFn = (name: HeroEventName, payload?: Record<string, string | number>) => void;

export const track: TrackFn = (name, payload = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("hero:event", { detail: { name, hero: "fashion-avatar-tryon", ...payload } }));
};
