/** Extrait le chemin Cal.com (ex. `sdcreativ/30min`) depuis une URL publique. */
export function getCalLinkFromBookingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "cal.com" && host !== "app.cal.com") return null;
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    return path || null;
  } catch {
    return null;
  }
}

export function isBookingConfigured(url?: string, embedUrl?: string): boolean {
  return Boolean(url?.trim() || embedUrl?.trim());
}

/**
 * Normalise une URL publique (booking, etc.).
 * Tolère les valeurs d’env déjà malformées du type
 * `https://https:https//cal.com/...` en reconstruisant `https://…`.
 */
export function normalizeBookingUrl(url: string | undefined): string {
  let s = url?.trim() ?? "";
  if (!s) return "";

  for (let i = 0; i < 10; i++) {
    const next = s
      .replace(/^https?:\/\//i, "")
      .replace(/^https?:\//i, "")
      .replace(/^https?:/i, "")
      .replace(/^https?\/+/i, "")
      .replace(/^\/+/, "");
    if (next === s) break;
    s = next;
  }

  if (!s) return "";
  return `https://${s}`;
}

function withBookingParams(
  url: string,
  params: Record<string, string>,
): string {
  const parsed = new URL(normalizeBookingUrl(url));
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, value);
  }
  // Évite le thème sombre hérité des préférences système
  parsed.searchParams.set("theme", "light");
  return parsed.toString();
}

/** URL Cal.com pour navigation pleine page (thème clair). */
export function buildBookingPublicUrl(url: string): string {
  return withBookingParams(url, {});
}

/** URL d’iframe embed Cal.com (thème clair, layout mensuel). */
export function buildBookingEmbedUrl(url: string, embedUrl?: string): string {
  const base = embedUrl?.trim() ? embedUrl : url;
  return withBookingParams(base, {
    embed: "true",
    layout: "month_view",
  });
}
