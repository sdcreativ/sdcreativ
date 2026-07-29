import { LOGO_FOOTER } from "@/lib/constants";
import {
  embedDocumentLogoDataUrl,
  DOCUMENT_LOGO_PATH,
} from "@/lib/billing/document-logo";
import {
  getInvoiceDocumentCompany,
  resolveDocumentLogoUrl,
} from "@/lib/billing/document-company";

/** Content-ID Resend / clients mail pour le logo inline. */
export const EMAIL_LOGO_CONTENT_ID = "sdc-logo";

export type EmailInlineAttachment = {
  filename: string;
  content: Buffer;
  contentId: string;
};

export type PreparedEmailLogo = {
  /** URL absolue HTTPS (PNG de préférence) — secours / clients sans CID. */
  absoluteUrl: string;
  /** src à utiliser dans le HTML (`cid:…` si PJ inline dispo). */
  src: string;
  /** Bloc `<img>` prêt pour les templates (`{{logo}}`). */
  logoHtml: string;
  attachment: EmailInlineAttachment | null;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  try {
    return { mime: match[1]!.trim(), buffer: Buffer.from(match[2]!, "base64") };
  } catch {
    return null;
  }
}

function filenameForMime(mime: string): string {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "logo.jpg";
  if (mime.includes("gif")) return "logo.gif";
  if (mime.includes("webp")) return "logo.webp";
  return "logo.png";
}

/**
 * Force une URL logo email-safe : PNG public, jamais SVG marketing.
 */
export function toEmailSafeLogoUrl(logoUrl: string | null | undefined, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const trimmed = logoUrl?.trim() ?? "";
  if (!trimmed || trimmed.includes("logo_sd.svg") || /\.svg(\?|$)/i.test(trimmed)) {
    return `${base}${LOGO_FOOTER.src}`;
  }
  return resolveDocumentLogoUrl(trimmed, siteUrl);
}

function buildLogoImg(src: string, alt: string, width = 148): string {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" style="display:block;max-width:${width}px;max-height:52px;width:auto;height:auto;border:0;outline:none" />`;
}

/**
 * Prépare le logo pour envoi Resend : PJ inline CID (fiable) + URL absolue PNG.
 */
export async function prepareEmailLogo(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com",
  alt?: string,
): Promise<PreparedEmailLogo> {
  const company = await getInvoiceDocumentCompany(siteUrl);
  const absoluteUrl = toEmailSafeLogoUrl(company.logoUrl, siteUrl);
  const agency = alt?.trim() || company.agencyName || "SD CREATIV";

  const dataUrl = await embedDocumentLogoDataUrl(absoluteUrl, siteUrl);
  const parsed = dataUrl ? dataUrlToBuffer(dataUrl) : null;

  // SVG data-URI inutilisable en mail → forcer le PNG documents
  if (parsed && parsed.mime.includes("svg")) {
    const pngData = await embedDocumentLogoDataUrl(
      `${siteUrl.replace(/\/$/, "")}${DOCUMENT_LOGO_PATH}`,
      siteUrl,
    );
    const pngParsed = pngData ? dataUrlToBuffer(pngData) : null;
    if (pngParsed && pngParsed.buffer.byteLength > 0) {
      const src = `cid:${EMAIL_LOGO_CONTENT_ID}`;
      return {
        absoluteUrl: `${siteUrl.replace(/\/$/, "")}${DOCUMENT_LOGO_PATH}`,
        src,
        logoHtml: buildLogoImg(src, agency),
        attachment: {
          filename: "logo.png",
          content: pngParsed.buffer,
          contentId: EMAIL_LOGO_CONTENT_ID,
        },
      };
    }
  }

  if (parsed && parsed.buffer.byteLength > 0 && parsed.mime.startsWith("image/")) {
    const src = `cid:${EMAIL_LOGO_CONTENT_ID}`;
    return {
      absoluteUrl,
      src,
      logoHtml: buildLogoImg(src, agency),
      attachment: {
        filename: filenameForMime(parsed.mime),
        content: parsed.buffer,
        contentId: EMAIL_LOGO_CONTENT_ID,
      },
    };
  }

  // Secours : URL HTTPS publique (PNG)
  return {
    absoluteUrl,
    src: absoluteUrl,
    logoHtml: buildLogoImg(absoluteUrl, agency),
    attachment: null,
  };
}

/** Variables `{{logo}}` / `{{logoUrl}}` pour les modèles CRM. */
export async function getEmailLogoTemplateVars(
  siteUrl?: string,
): Promise<{ logo: string; logoUrl: string; logoAttachment: EmailInlineAttachment | null }> {
  const prepared = await prepareEmailLogo(siteUrl);
  return {
    logo: prepared.logoHtml,
    logoUrl: prepared.src,
    logoAttachment: prepared.attachment,
  };
}
