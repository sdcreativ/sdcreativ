const PUBLIC_MEDIA_PREFIXES = [
  "blog/media/",
  "crm-docs/media/",
  "crm/avatars/",
  "site/logo/",
  "site/media/",
] as const;

export function isS3ImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (url.includes(".amazonaws.com/")) return true;
  const base = process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "")
    || process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base && url.startsWith(`${base}/`)) return true;
  return false;
}

export function parseS3KeyFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) return null;

    const publicBase =
      process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (publicBase) {
      try {
        const base = new URL(publicBase);
        if (parsed.origin === base.origin && parsed.pathname.startsWith(base.pathname)) {
          const rest = parsed.pathname.slice(base.pathname.length).replace(/^\//, "");
          if (rest) return decodeURIComponent(rest);
        }
      } catch {
        /* ignore invalid base */
      }
    }

    // https://bucket.s3.region.amazonaws.com/key
    if (parsed.hostname.startsWith(`${bucket}.s3.`) || parsed.hostname === `${bucket}.s3.amazonaws.com`) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }

    // https://bucket.s3-region.amazonaws.com/key (legacy)
    if (parsed.hostname === `${bucket}.s3-${process.env.AWS_REGION}.amazonaws.com`) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }

    // https://s3.region.amazonaws.com/bucket/key
    if (parsed.hostname.startsWith("s3.") && parsed.pathname.startsWith(`/${bucket}/`)) {
      return decodeURIComponent(parsed.pathname.slice(bucket.length + 2));
    }

    return null;
  } catch {
    return null;
  }
}

export function isPublicMediaS3Key(key: string): boolean {
  return PUBLIC_MEDIA_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** URL affichable dans le navigateur (proxy S3 privé, chemins locaux inchangés). */
export function resolveImageDisplayUrl(url: string): string {
  if (!url || url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (isS3ImageUrl(url)) {
    return `/api/media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** next/image ne peut pas optimiser /api/media?url=… (retourne 400 via _next/image). */
export function isProxiedMediaUrl(resolvedUrl: string): boolean {
  return resolvedUrl.startsWith("/api/media");
}
