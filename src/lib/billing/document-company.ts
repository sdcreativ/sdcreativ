import { LOGO, LOGO_FOOTER } from "@/lib/constants";
import { embedDocumentLogoDataUrl } from "@/lib/billing/document-logo";
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
  // Documents : PNG par défaut (le SVG marketing est trop lourd pour PDF / emails)
  if (!logoUrl?.trim() || logoUrl.trim() === LOGO.src) {
    return `${base}${LOGO_FOOTER.src}`;
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
  options?: { embedLogo?: boolean },
): Promise<InvoiceDocumentCompany> {
  const [settings, site] = await Promise.all([getCrmSettings(), getSitePublicSettings()]);
  const company = mergeInvoiceDocumentCompany(settings.branding, site, siteUrl);
  if (!options?.embedLogo) {
    return company;
  }
  const embedded = await embedDocumentLogoDataUrl(company.logoUrl, siteUrl);
  return {
    ...company,
    logoUrl: embedded || company.logoUrl,
  };
}

/** Société + logo embarqué (data-URI) pour PDF / contrats autonomes. */
export async function getPdfDocumentCompany(
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com",
): Promise<InvoiceDocumentCompany> {
  return getInvoiceDocumentCompany(siteUrl, { embedLogo: true });
}
