"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { isEnglishPath } from "@/i18n/routes";
import type { ResolvedSitePublic } from "@/lib/site-public-types";

export function FooterGate({ sitePublic }: { sitePublic: ResolvedSitePublic }) {
  const pathname = usePathname() ?? "";
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/espace-client") ||
    pathname.startsWith("/presentation")
  ) {
    return null;
  }
  return <Footer sitePublic={sitePublic} locale={isEnglishPath(pathname) ? "en" : "fr"} />;
}
