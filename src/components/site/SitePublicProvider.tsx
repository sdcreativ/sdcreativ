"use client";

import { createContext, useContext } from "react";
import type { ResolvedSitePublic } from "@/lib/site-public-types";
import { buildWhatsappUrl, resolveSitePublic } from "@/lib/site-public-resolver";

const SitePublicContext = createContext<ResolvedSitePublic | null>(null);

export function SitePublicProvider({
  value,
  children,
}: {
  value: ResolvedSitePublic;
  children: React.ReactNode;
}) {
  return <SitePublicContext.Provider value={value}>{children}</SitePublicContext.Provider>;
}

export function useSitePublic(): ResolvedSitePublic {
  const ctx = useContext(SitePublicContext);
  return ctx ?? resolveSitePublic(null);
}

export function useWhatsappUrl(message?: string): string {
  const { contact } = useSitePublic();
  return buildWhatsappUrl(contact, message);
}
