export type BlogHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

export function slugifyHeading(text: string): string {
  return decodeEntities(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "section";
}

/**
 * Extrait les h2/h3 et injecte des `id` stables pour ancres + sommaire.
 * Préserve un id existant s’il est déjà présent.
 */
export function prepareBlogContentHtml(html: string): {
  html: string;
  headings: BlogHeading[];
} {
  if (!html.trim()) return { html, headings: [] };

  const used = new Map<string, number>();
  const headings: BlogHeading[] = [];

  const nextId = (base: string) => {
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };

  const prepared = html.replace(
    /<(h[23])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (full, tag: string, attrs = "", inner: string) => {
      const level = Number(tag.slice(1)) as 2 | 3;
      const text = decodeEntities(stripTags(inner));
      if (!text) return full;

      const existing = /\sid\s*=\s*(["'])([^"']+)\1/i.exec(attrs)?.[2];
      const id = existing || nextId(slugifyHeading(text));
      const attrsWithoutId = attrs.replace(/\s+id\s*=\s*(["'])[^"']*\1/i, "");
      headings.push({ id, text, level });
      return `<${tag}${attrsWithoutId} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html: prepared, headings };
}
