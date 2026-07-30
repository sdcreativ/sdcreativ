import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOGO, LOGO_FOOTER, SITE } from "@/lib/constants";
import { isS3ImageUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { getSitePublicSettings } from "@/lib/site-public-settings";

export type FaviconPayload = {
  body: ArrayBuffer | Buffer;
  contentType: string;
};

const FALLBACK_MARK = {
  background: "#0072B5",
  label: "SD",
} as const;

function guessContentType(url: string, header?: string | null): string {
  if (header && /^image\//i.test(header)) return header.split(";")[0]!.trim();
  const lower = url.toLowerCase();
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "image/jpeg";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".ico")) return "image/x-icon";
  return "image/png";
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SITE.url.replace(/\/$/, "")}${url}`;
  return url;
}

async function readPublicAsset(publicPath: string): Promise<FaviconPayload | null> {
  if (!publicPath.startsWith("/") || publicPath.startsWith("//")) return null;
  try {
    const filePath = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
    const body = await readFile(filePath);
    return { body, contentType: guessContentType(publicPath) };
  } catch {
    return null;
  }
}

async function fetchRemote(url: string): Promise<FaviconPayload | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 300, tags: ["site-public-settings"] },
      headers: { Accept: "image/*,*/*" },
    });
    if (!res.ok) return null;
    const body = Buffer.from(await res.arrayBuffer());
    return {
      body,
      contentType: guessContentType(url, res.headers.get("content-type")),
    };
  } catch {
    return null;
  }
}

/** URL relative/absolue du logo site (CRM) pour les balises <link rel="icon">. */
export async function getSiteIconHref(): Promise<string> {
  const { logoUrl } = await getSitePublicSettings();
  const raw = logoUrl?.trim() || LOGO.src;
  const display = resolveImageDisplayUrl(raw);
  if (display.startsWith("/")) return display;
  if (isS3ImageUrl(raw)) return resolveImageDisplayUrl(raw);
  return display;
}

/**
 * Charge les octets du favicon : logo site → PNG footer → null (fallback ImageResponse).
 * `preferRaster` ignore les SVG (Satori / apple-touch préfèrent du PNG).
 */
export async function loadSiteFaviconBytes(options?: {
  preferRaster?: boolean;
}): Promise<FaviconPayload | null> {
  const preferRaster = options?.preferRaster ?? false;
  const { logoUrl } = await getSitePublicSettings();
  const candidates = [
    logoUrl?.trim() || "",
    LOGO.src,
    LOGO_FOOTER.src,
  ].filter(Boolean);

  const tried = new Set<string>();

  for (const candidate of candidates) {
    const display = resolveImageDisplayUrl(candidate);
    if (tried.has(display)) continue;
    tried.add(display);

    if (preferRaster && /\.svg(\?|$)/i.test(display)) continue;

    if (display.startsWith("/") && !display.startsWith("/api/")) {
      const local = await readPublicAsset(display);
      if (local) {
        if (preferRaster && local.contentType.includes("svg")) continue;
        return local;
      }
    }

    const absolute = toAbsoluteUrl(display);
    const remote = await fetchRemote(absolute);
    if (remote) {
      if (preferRaster && remote.contentType.includes("svg")) continue;
      return remote;
    }
  }

  return null;
}

export { FALLBACK_MARK };
