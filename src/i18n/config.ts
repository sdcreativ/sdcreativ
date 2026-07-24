/**
 * Version anglaise publique (`/en/*`).
 *
 * `false` = suspendue : redirection middleware vers le FR, pas de switcher,
 * pas de hreflang/sitemap EN. Le code sous `src/app/en/` est conservé pour plus tard.
 *
 * Pour republier : passer à `true` (et optionnellement `ENGLISH_LOCALE_ENABLED=true`
 * dans `.env.docker` — prioritaire sur cette constante).
 */
const ENGLISH_LOCALE_DEFAULT = false;

export function isEnglishLocaleEnabled(): boolean {
  const raw =
    process.env.ENGLISH_LOCALE_ENABLED?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_ENGLISH_LOCALE_ENABLED?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return ENGLISH_LOCALE_DEFAULT;
}
