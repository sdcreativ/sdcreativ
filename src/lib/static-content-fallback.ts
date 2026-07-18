/**
 * Autorise le fallback vers `src/content/*` (seed / démo).
 * En production : désactivé par défaut pour ne pas afficher de faux clients/articles.
 * Override : ALLOW_STATIC_CONTENT_FALLBACK=true|false
 */
export function allowStaticContentFallback(): boolean {
  const override = process.env.ALLOW_STATIC_CONTENT_FALLBACK?.trim().toLowerCase();
  if (override === "true" || override === "1") return true;
  if (override === "false" || override === "0") return false;
  return process.env.NODE_ENV !== "production";
}
