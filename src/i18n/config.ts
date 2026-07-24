/**
 * Version anglaise publique (`/en/*`) — désactivée complètement.
 *
 * - Middleware : `/en/*` → équivalent FR (308)
 * - Switcher masqué, pas de hreflang/sitemap EN
 * - Le code sous `src/app/en/` est conservé pour une republier ultérieure
 *
 * Pour republier : rétablir la lecture de `ENGLISH_LOCALE_ENABLED` /
 * `NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED` (voir historique git) et passer
 * éventuellement `ENGLISH_LOCALE_ENABLED=true` dans `.env.docker`.
 */
export function isEnglishLocaleEnabled(): boolean {
  return false;
}
