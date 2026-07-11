import { LOGO } from "@/lib/constants";
import { getCrmSettings } from "@/lib/crm-settings";
import type { CrmBranding } from "@/lib/crm-settings-types";
import { getSitePublicSettings } from "@/lib/site-public-settings";
import type { ResolvedSitePublic } from "@/lib/site-public-types";

export type InvoiceDocumentCompany = {
  agencyName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  siteUrl: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  rccm: string;
  ncc: string;
};

export function resolveDocumentLogoUrl(
  logoUrl: string | null | undefined,
  siteUrl: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  if (!logoUrl?.trim()) {
    return `${base}${LOGO.src}`;
  }
  const trimmed = logoUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }
  return trimmed;
}

export function mergeInvoiceDocumentCompany(
  branding: CrmBranding,
  site: ResolvedSitePublic,
  siteUrl: string,
): InvoiceDocumentCompany {
  const logoSource = site.logoUrl?.trim() || branding.logoUrl;
  return {
    agencyName: site.companyName?.trim() || branding.agencyName,
    tagline: site.tagline?.trim() || branding.tagline,
    primaryColor: branding.primaryColor,
    accentColor: branding.accentColor,
    logoUrl: resolveDocumentLogoUrl(logoSource, siteUrl),
    siteUrl,
    phone: site.contact.phone,
    email: site.contact.email,
    address: site.contact.address,
    hours: site.contact.hours,
    rccm: site.legal.rccm,
    ncc: site.legal.ncc,
  };
}

export async function getInvoiceDocumentCompany(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com",
): Promise<InvoiceDocumentCompany> {
  const [settings, site] = await Promise.all([getCrmSettings(), getSitePublicSettings()]);
  return mergeInvoiceDocumentCompany(settings.branding, site, siteUrl);
}
