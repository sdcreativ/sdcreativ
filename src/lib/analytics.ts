/** Tracking GA4 côté client (no-op si gtag absent / cookies refusés). */

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
  }
}

export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/** CTA marketing — `data-track-cta="nav_devis"` → event `cta_click` + `cta_id`. */
export function trackCta(ctaId: string, extras?: Record<string, string>): void {
  trackEvent("cta_click", { cta_id: ctaId, ...extras });
}
