import { resolveImageDisplayUrl } from "@/lib/image-url";

/** Résout un screenshot stocké (filename legacy, path /uploads, ou URL S3 absolue). */
export function resolveCrmDocScreenshotSrc(shot: string): string {
  const value = shot.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return `/crm-docs/${value}`;
}

/** URL affichable navigateur (proxy S3 privé via /api/media). */
export function resolveCrmDocScreenshotDisplaySrc(shot: string): string {
  return resolveImageDisplayUrl(resolveCrmDocScreenshotSrc(shot));
}
