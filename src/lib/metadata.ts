import type { Metadata } from "next";
import { SITE, LOGO } from "@/lib/constants";
import { getHreflangAlternates } from "@/i18n/routes";

const DEFAULT_OG_IMAGE = "/opengraph-image";

type PageMeta = {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
  locale?: "fr" | "en";
};

export function createMetadata({
  title,
  description,
  path = "",
  noIndex = false,
  image = DEFAULT_OG_IMAGE,
  locale = "fr",
}: PageMeta): Metadata {
  const url = `${SITE.url}${path}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE.url}${image}`;
  const hreflang = getHreflangAlternates(path, SITE.url);

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
      icon: [{ url: LOGO.src, type: "image/svg+xml" }],
      apple: [{ url: LOGO.src, type: "image/svg+xml" }],
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      locale: locale === "en" ? "en_US" : "fr_CI",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE.name} — ${SITE.tagline}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
