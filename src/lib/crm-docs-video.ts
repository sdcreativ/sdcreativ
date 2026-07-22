/**
 * Convertit une URL Loom (share / embed) en URL d’iframe.
 * Accepte aussi d’autres embeds génériques (YouTube) si déjà en embed.
 */
export function toCrmDocVideoEmbedUrl(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "loom.com" || host.endsWith(".loom.com")) {
      const shareMatch = url.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
      if (shareMatch) return `https://www.loom.com/embed/${shareMatch[1]}`;
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9]+)/);
      if (embedMatch) return `https://www.loom.com/embed/${embedMatch[1]}`;
    }

    if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
      if (host === "youtu.be") {
        const id = url.pathname.replace(/^\//, "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      const embed = url.pathname.match(/\/embed\/([^/?]+)/);
      if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
    }

    // URL déjà utilisable en iframe
    if (url.pathname.includes("/embed/")) return url.toString();
    return null;
  } catch {
    return null;
  }
}
