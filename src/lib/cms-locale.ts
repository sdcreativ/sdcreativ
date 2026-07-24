import { allowStaticContentFallback } from "@/lib/static-content-fallback";

export type CmsLocale = "fr" | "en";

/**
 * Seed `src/content/*` est en français.
 * Sur les pages EN : jamais de fallback silencieux vers ce seed (ni vers la locale FR en base).
 */
export function allowLocaleStaticSeed(locale: string): boolean {
  if (locale === "en") return false;
  return allowStaticContentFallback();
}
