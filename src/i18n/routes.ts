/** Paires de routes FR ↔ EN indexables avec hreflang. */
export const LOCALE_ROUTE_PAIRS = [
  { fr: "/", en: "/en" },
  { fr: "/services", en: "/en/services" },
  { fr: "/tarifs", en: "/en/pricing" },
  { fr: "/a-propos", en: "/en/about" },
  { fr: "/contact", en: "/en/contact" },
  { fr: "/realisations", en: "/en/portfolio" },
  { fr: "/carrieres", en: "/en/careers" },
  { fr: "/maintenance", en: "/en/maintenance" },
  { fr: "/audit-gratuit", en: "/en/free-audit" },
  { fr: "/mentions-legales", en: "/en/legal" },
  { fr: "/politique-confidentialite", en: "/en/privacy" },
  { fr: "/blog", en: "/en/blog" },
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
