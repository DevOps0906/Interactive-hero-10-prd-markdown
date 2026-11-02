// 공통 품질 자동 조절·DPR·모션 감소 유틸 (브라우저 API 사용 함수는 클라이언트에서만 호출)

export type QualityTier = "low" | "medium" | "high";

/** 모션 감소 선호 여부. SSR에서는 false. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 모션 감소 설정 변경 구독. 해제 함수를 반환한다. */
export function subscribeReducedMotion(onChange: (reduced: boolean) => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** devicePixelRatio를 [min, max]로 제한. Canvas `dpr` 값으로 사용. */
export function clampDpr(max = 2, min = 1): number {
  if (typeof window === "undefined") return min;
  return Math.min(Math.max(window.devicePixelRatio || 1, min), max);
}

/** 코어 수·메모리·모션 설정으로 거친 품질 등급을 추정한다. reduced-motion이면 low. */
export function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined" || prefersReducedMotion()) return "low";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 2) return "low";
  if (cores <= 8 || memory <= 4) return "medium";
  return "high";
}

/** 등급별 DPR 상한. */
export const DPR_MAX_BY_TIER: Record<QualityTier, number> = { low: 1, medium: 1.5, high: 2 };

/** 프레임 시간(ms) 평균이 예산을 넘으면 등급을 한 단계 낮춘다. 올리지는 않는다. */
export function downgradeTier(current: QualityTier, avgFrameMs: number, budgetMs = 20): QualityTier {
  if (avgFrameMs <= budgetMs) return current;
  return current === "high" ? "medium" : "low";
}
