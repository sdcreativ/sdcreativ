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

/** Normalise une URL de booking (ajoute https:// si absent). */
export function normalizeBookingUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}
