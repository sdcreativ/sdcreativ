import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_FOOTER } from "@/lib/constants";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** Logo documents PDF : PNG (le SVG marketing est trop lourd / fragile en PDF). */
export const DOCUMENT_LOGO_PATH = LOGO_FOOTER.src;

function mimeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function toDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function readPublicAsset(relativeUrl: string): Promise<Buffer | null> {
  const clean = relativeUrl.split("?")[0]!.replace(/^\/+/, "");
  const candidates = [
    path.join(process.cwd(), "public", clean),
    path.join(process.cwd(), clean),
  ];
  for (const filePath of candidates) {
    try {
      await access(filePath);
      return await readFile(filePath);
    } catch {
      // next candidate
    }
  }
  return null;
}

function urlToPublicRelative(logoUrl: string, siteUrl: string): string | null {
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  const base = siteUrl.replace(/\/$/, "");
  if (trimmed.startsWith(`${base}/`)) {
    return trimmed.slice(base.length);
  }
  try {
    const u = new URL(trimmed);
    if (u.pathname.startsWith("/images/") || u.pathname.startsWith("/uploads/")) {
      return u.pathname;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Convertit le logo en data-URI pour les PDF/HTML autonomes.
 * Évite les images cassées (URL distante, SVG trop lourd, réseau Docker).
 */
export async function embedDocumentLogoDataUrl(
  logoUrl: string | null | undefined,
  siteUrl: string,
): Promise<string> {
  const trimmed = logoUrl?.trim() ?? "";
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }

  // 1) Fichier public local (prioritaire)
  const relative =
    (trimmed ? urlToPublicRelative(trimmed, siteUrl) : null) ?? DOCUMENT_LOGO_PATH;
  const local = await readPublicAsset(relative);
  if (local) {
    // Remplacer le SVG marketing par le PNG documents si c’est le logo SVG officiel
    if (relative.includes("logo_sd.svg")) {
      const png = await readPublicAsset(DOCUMENT_LOGO_PATH);
      if (png) return toDataUrl(png, "image/png");
    }
    return toDataUrl(local, mimeFromFilename(relative));
  }

  // 2) Téléchargement distant (logo custom S3 / CDN)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    try {
      const url = trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(8_000),
        headers: { Accept: "image/*,*/*" },
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const mime =
          res.headers.get("content-type")?.split(";")[0]?.trim() ||
          mimeFromFilename(url);
        if (buffer.byteLength > 0 && mime.startsWith("image/")) {
          return toDataUrl(buffer, mime);
        }
      }
    } catch (error) {
      console.warn("[document-logo] fetch logo distant impossible :", error);
    }
  }

  // 3) Fallback PNG local
  const fallback = await readPublicAsset(DOCUMENT_LOGO_PATH);
  if (fallback) {
    return toDataUrl(fallback, "image/png");
  }

  return "";
}
