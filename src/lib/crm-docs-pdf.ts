import type { CrmDocPageRecord } from "@/lib/crm-docs-types";
import { resolveCrmDocScreenshotSrc } from "@/lib/crm-docs-screenshot-url";
import { resolveImageDisplayUrl } from "@/lib/image-url";

export const CRM_DOC_PDF_PACKS = {
  commercial: {
    categorySlug: "commercial",
    title: "Guide commercial",
    filename: "guide-commercial-sdcreativ",
  },
  hr: {
    categorySlug: "hr",
    title: "Guide RH",
    filename: "guide-rh-sdcreativ",
  },
} as const;

export type CrmDocPdfPackId = keyof typeof CRM_DOC_PDF_PACKS;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolutize(src: string, siteUrl: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const base = siteUrl.replace(/\/$/, "");
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

/** Pour PDF : proxy S3 via /api/media afin que Chromium lise un bucket privé. */
function screenshotUrlForPdf(shot: string, siteUrl: string): string {
  const raw = resolveCrmDocScreenshotSrc(shot);
  const display = resolveImageDisplayUrl(raw);
  return absolutize(display, siteUrl);
}

export function buildCrmDocsPackPdfHtml(
  packTitle: string,
  pages: CrmDocPageRecord[],
  siteUrl: string,
): string {
  const sections = pages
    .map((page) => {
      const shot = page.screenshots?.[0]
        ? screenshotUrlForPdf(page.screenshots[0], siteUrl)
        : null;
      const img = shot
        ? `<img src="${escapeHtml(shot)}" alt="" style="max-width:100%;margin:12px 0;border:1px solid #e5e7eb;border-radius:8px" />`
        : "";
      return `
      <article style="page-break-inside:avoid;margin:0 0 36px;padding-bottom:24px;border-bottom:1px solid #e5e7eb">
        <h2 style="color:#1e40af;margin:0 0 8px;font-size:1.25rem">${escapeHtml(page.title)}</h2>
        ${page.summary ? `<p style="font-weight:600;margin:0 0 12px">${escapeHtml(page.summary)}</p>` : ""}
        ${page.explanation ? `<h3 style="font-size:0.75rem;text-transform:uppercase;color:#6b7280;margin:16px 0 4px">Explication</h3><p style="white-space:pre-wrap;margin:0;line-height:1.5">${escapeHtml(page.explanation)}</p>` : ""}
        ${page.howItWorks ? `<h3 style="font-size:0.75rem;text-transform:uppercase;color:#6b7280;margin:16px 0 4px">Fonctionnement</h3><p style="white-space:pre-wrap;margin:0;line-height:1.5">${escapeHtml(page.howItWorks)}</p>` : ""}
        ${img}
        ${page.href ? `<p style="margin:12px 0 0;font-size:0.8rem"><a href="${escapeHtml(absolutize(page.href, siteUrl))}">Ouvrir dans le CRM</a></p>` : ""}
      </article>`;
    })
    .join("\n");

  const generated = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(packTitle)} — SD CREATIV</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #111827; max-width: 820px; margin: 40px auto; padding: 0 24px; line-height: 1.45; }
    h1 { color: #1e40af; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 32px; }
    .footer { margin-top: 48px; font-size: 0.75rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(packTitle)}</h1>
  <p class="meta">Pack onboarding SD CREATIV · ${pages.length} fiche(s) · Généré le ${escapeHtml(generated)}</p>
  ${sections || "<p>Aucune fiche publiée dans ce pack.</p>"}
  <p class="footer">Documentation interne — ${escapeHtml(siteUrl.replace(/\/$/, ""))}/admin/crm/documentation</p>
</body>
</html>`;
}
