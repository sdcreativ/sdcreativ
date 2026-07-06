/** Utilitaires contenu blog (sans dépendance serveur). */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function paragraphsToHtml(paragraphs: string[]): string {
  if (paragraphs.length === 0) return "";
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

export function htmlToParagraphs(html: string): string[] {
  if (!html.trim()) return [];

  const withBreaks = html
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n");

  const text = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function stripHtml(html: string): string {
  return htmlToParagraphs(html).join(" ");
}

export function estimateReadTime(htmlOrText: string): string {
  const words = stripHtml(htmlOrText).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

export function isHtmlEmpty(html: string): boolean {
  return stripHtml(html).trim().length === 0;
}

export function resolveContentHtml(record: {
  contentHtml: string | null;
  content: string[];
}): string {
  if (record.contentHtml?.trim()) return record.contentHtml;
  return paragraphsToHtml(record.content);
}
