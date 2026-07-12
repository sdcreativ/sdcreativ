"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import type { ResolvedSitePublic } from "@/lib/site-public-types";

export function FooterGate({ sitePublic }: { sitePublic: ResolvedSitePublic }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin") || pathname.startsWith("/espace-client") || pathname.startsWith("/presentation")) return null;
  return <Footer sitePublic={sitePublic} />;
}
