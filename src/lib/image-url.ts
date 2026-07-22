const PUBLIC_MEDIA_PREFIXES = [
  "blog/media/",
  "crm-docs/media/",
  "crm/avatars/",
  "site/logo/",
  "site/media/",
] as const;

export type S3ObjectRef = {
  bucket: string;
  key: string;
  /** Région déduite de l’hôte S3 si possible. */
  region: string | null;
};

export function isS3ImageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (url.includes(".amazonaws.com/")) return true;
  const base =
    process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (base && url.startsWith(`${base}/`)) return true;
  return false;
}

function decodeS3Path(pathname: string): string {
  return decodeURIComponent(pathname.replace(/^\//, ""));
}

/**
 * Extrait bucket + clé (+ région) depuis une URL S3 publique.
 * Indépendant de AWS_S3_BUCKET pour supporter un bucket média legacy
 * différent du bucket documents courant.
 */
export function parseS3ObjectFromPublicUrl(url: string): S3ObjectRef | null {
  try {
    const normalized = url.trim().replace(/ /g, "%20");
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const path = decodeS3Path(parsed.pathname);
    if (!path) return null;

    const publicBase =
      process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
    if (publicBase) {
      try {
        const base = new URL(publicBase);
        if (parsed.origin === base.origin && parsed.pathname.startsWith(base.pathname)) {
          const rest = decodeS3Path(parsed.pathname.slice(base.pathname.length));
          if (rest) {
            const fromHost = parseVirtualHostedS3(host);
            return {
              bucket: fromHost?.bucket || process.env.AWS_S3_BUCKET || "",
              key: rest,
              region: fromHost?.region ?? process.env.AWS_REGION ?? null,
            };
          }
        }
      } catch {
        /* ignore invalid base */
      }
    }

    // https://bucket.s3.region.amazonaws.com/key
    // https://bucket.s3-region.amazonaws.com/key (legacy)
    const virtual = parseVirtualHostedS3(host);
    if (virtual) {
      return { bucket: virtual.bucket, key: path, region: virtual.region };
    }

    // https://s3.region.amazonaws.com/bucket/key
    const pathStyle = host.match(/^s3(?:\.([a-z0-9-]+))?\.amazonaws\.com$/i);
    if (pathStyle) {
      const slash = path.indexOf("/");
      if (slash <= 0) return null;
      return {
        bucket: path.slice(0, slash),
        key: path.slice(slash + 1),
        region: pathStyle[1] ?? process.env.AWS_REGION ?? null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function parseVirtualHostedS3(
  hostname: string,
): { bucket: string; region: string | null } | null {
  // bucket.s3.eu-west-3.amazonaws.com
  let m = hostname.match(/^(.+)\.s3\.([a-z0-9-]+)\.amazonaws\.com$/i);
  if (m?.[1] && m[2]) return { bucket: m[1], region: m[2] };

  // bucket.s3.amazonaws.com
  m = hostname.match(/^(.+)\.s3\.amazonaws\.com$/i);
  if (m?.[1]) return { bucket: m[1], region: process.env.AWS_REGION ?? null };

  // bucket.s3-eu-west-3.amazonaws.com
  m = hostname.match(/^(.+)\.s3-([a-z0-9-]+)\.amazonaws\.com$/i);
  if (m?.[1] && m[2]) return { bucket: m[1], region: m[2] };

  return null;
}

/** @deprecated Préférer parseS3ObjectFromPublicUrl. */
export function parseS3KeyFromPublicUrl(url: string): string | null {
  return parseS3ObjectFromPublicUrl(url)?.key ?? null;
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
