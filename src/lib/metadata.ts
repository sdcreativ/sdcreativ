import type { Metadata } from "next";
import { SITE, LOGO, SOCIAL } from "@/lib/constants";
import { getHreflangAlternates } from "@/i18n/routes";

const DEFAULT_OG_IMAGE = "/opengraph-image";

function resolveTwitterHandle(): string | undefined {
  const raw = SOCIAL.twitter.trim();
  if (!raw) return undefined;
  const fromUrl = raw.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i)?.[1];
  const handle = (fromUrl ?? raw).replace(/^@/, "").trim();
  return handle || undefined;
}

type PageMeta = {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
  locale?: "fr" | "en";
  /** Favicon / apple-touch — logo site CRM si fourni. */
  iconHref?: string;
  openGraphType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function createMetadata({
  title,
  description,
  path = "",
  noIndex = false,
  image = DEFAULT_OG_IMAGE,
  locale = "fr",
  iconHref,
  openGraphType = "website",
  publishedTime,
  modifiedTime,
}: PageMeta): Metadata {
  const url = `${SITE.url}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE.url}${image}`;
  const hreflang = getHreflangAlternates(path, SITE.url);
  const icon = iconHref?.trim() || LOGO.src;
  const iconIsSvg = /\.svg(\?|$)/i.test(icon) || icon.includes("image/svg");
  const twitterHandle = resolveTwitterHandle();

  return {
    title:
      path === "" || path === "/"
        ? `${SITE.name} — ${SITE.tagline}`
        : `${title} | ${SITE.name}`,
    description,
    metadataBase: new URL(SITE.url),
    alternates: {
      canonical: url,
      ...(hreflang ? { languages: hreflang } : {}),
    },
    icons: {
      icon: [
        { url: "/icon", type: "image/png", sizes: "32x32" },
        {
          url: icon,
          type: iconIsSvg ? "image/svg+xml" : undefined,
        },
      ],
      apple: [
        { url: "/apple-icon", type: "image/png", sizes: "180x180" },
        { url: icon },
      ],
      shortcut: [{ url: "/icon", type: "image/png" }],
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: locale === "en" ? "en_US" : "fr_CI",
      type: openGraphType,
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
      ...(twitterHandle
        ? { site: `@${twitterHandle}`, creator: `@${twitterHandle}` }
        : {}),
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
