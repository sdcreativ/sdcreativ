import { isEnglishLocaleEnabled } from "@/i18n/config";

/** Paires de routes FR ↔ EN indexables avec hreflang. */
export const LOCALE_ROUTE_PAIRS = [
  { fr: "/", en: "/en" },
  { fr: "/services", en: "/en/services" },
  { fr: "/tarifs", en: "/en/pricing" },
  { fr: "/a-propos", en: "/en/about" },
  { fr: "/contact", en: "/en/contact" },
  { fr: "/devis", en: "/en/devis" },
  { fr: "/rendez-vous", en: "/en/book" },
  { fr: "/realisations", en: "/en/portfolio" },
  { fr: "/carrieres", en: "/en/careers" },
  { fr: "/maintenance", en: "/en/maintenance" },
  { fr: "/formations", en: "/en/training" },
  { fr: "/audit-gratuit", en: "/en/free-audit" },
  { fr: "/faq", en: "/en/faq" },
  { fr: "/solutions-ia", en: "/en/solutions-ia" },
  { fr: "/blog", en: "/en/blog" },
  { fr: "/agence-web-abidjan", en: "/en/web-agency-abidjan" },
  { fr: "/creation-site-cote-ivoire", en: "/en/website-development-cote-divoire" },
  { fr: "/mentions-legales", en: "/en/legal" },
  { fr: "/politique-confidentialite", en: "/en/privacy" },
] as const;

export function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

export function getAlternatePath(pathname: string, target: "fr" | "en"): string {
  const path = normalizePath(pathname);

  for (const pair of LOCALE_ROUTE_PAIRS) {
    if (path === pair.fr || path === pair.en) {
      return target === "en" ? pair.en : pair.fr;
    }
  }

  const serviceMatch = path.match(/^\/(?:en\/)?services\/([^/]+)$/);
  if (serviceMatch) {
    const slug = serviceMatch[1];
    return target === "en" ? `/en/services/${slug}` : `/services/${slug}`;
  }

  const portfolioMatch = path.match(/^\/(?:en\/portfolio|realisations)\/([^/]+)$/);
  if (portfolioMatch) {
    const slug = portfolioMatch[1];
    return target === "en" ? `/en/portfolio/${slug}` : `/realisations/${slug}`;
  }

  const trainingMatch = path.match(/^\/(?:en\/training|formations)\/([^/]+)$/);
  if (trainingMatch) {
    const slug = trainingMatch[1];
    return target === "en" ? `/en/training/${slug}` : `/formations/${slug}`;
  }

  const blogMatch = path.match(/^\/(?:en\/)?blog\/([^/]+)$/);
  if (blogMatch) {
    const slug = blogMatch[1];
    return target === "en" ? `/en/blog/${slug}` : `/blog/${slug}`;
  }

  return target === "en" ? "/en" : "/";
}

export function getHreflangAlternates(
  path: string,
  siteUrl: string,
): Record<string, string> | undefined {
  const normalized = normalizePath(path);

  for (const pair of LOCALE_ROUTE_PAIRS) {
    if (normalized === pair.fr || normalized === pair.en) {
      const frUrl = pair.fr === "/" ? siteUrl : `${siteUrl}${pair.fr}`;
      if (!isEnglishLocaleEnabled()) {
        return {
          fr: frUrl,
          "x-default": frUrl,
        };
      }
      const enUrl = `${siteUrl}${pair.en}`;
      return {
        fr: frUrl,
        en: enUrl,
        "x-default": frUrl,
      };
    }
  }

  return undefined;
}

export function isEnglishPath(pathname: string): boolean {
  return pathname === "/en" || pathname.startsWith("/en/");
}
