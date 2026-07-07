"use client";

import { DialogProvider } from "@/components/ui/DialogProvider";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { HtmlLangSync } from "@/components/i18n/HtmlLangSync";
import { SitePublicProvider } from "@/components/site/SitePublicProvider";
import type { ResolvedSitePublic } from "@/lib/site-public-types";

export function AppProviders({
  children,
  sitePublic,
}: {
  children: React.ReactNode;
  sitePublic: ResolvedSitePublic;
}) {
  return (
    <SitePublicProvider value={sitePublic}>
      <DialogProvider>
        <HtmlLangSync />
        {children}
        <PwaRegister />
      </DialogProvider>
    </SitePublicProvider>
  );
}
