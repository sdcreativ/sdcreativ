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

/** Construit une URL d’iframe embed sans casser les query params existants. */
export function buildBookingEmbedUrl(url: string, embedUrl?: string): string {
  if (embedUrl?.trim()) return embedUrl.trim();
  const parsed = new URL(url);
  parsed.searchParams.set("embed", "true");
  parsed.searchParams.set("theme", "light");
  return parsed.toString();
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

  // Décolle les préfixes protocole empilés jusqu’à obtenir host/chemin nu
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
