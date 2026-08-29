import type { ImageLoaderProps } from "next/image";
import { isProxiedMediaUrl } from "@/lib/image-url";

const MEDIA_WIDTHS = [64, 80, 96, 128, 160, 256, 384, 640, 750, 828, 1080, 1200, 1920] as const;

export function snapMediaWidth(width: number): number {
  const clamped = Math.max(16, Math.min(1920, Math.round(width)));
  return MEDIA_WIDTHS.find((value) => value >= clamped) ?? 1920;
}

/** next/image ne peut pas optimiser `/api/media` via `/_next/image` : on passe w/q au proxy. */
export function mediaImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!isProxiedMediaUrl(src)) return src;
  const params = new URLSearchParams();
  const queryIndex = src.indexOf("?");
  const path = queryIndex === -1 ? src : src.slice(0, queryIndex);
  const existing = queryIndex === -1 ? "" : src.slice(queryIndex + 1);
  if (existing) {
    new URLSearchParams(existing).forEach((value, key) => {
      if (key !== "w" && key !== "q") params.set(key, value);
    });
  }
  params.set("w", String(snapMediaWidth(width)));
  params.set("q", String(quality ?? 75));
  return `${path}?${params.toString()}`;
}
