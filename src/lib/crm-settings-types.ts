export type CrmBranding = {
  agencyName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
};

export type CrmEmailTemplate = {
  id: string;
  label: string;
  subject: string;
  htmlBody: string;
  description: string;
};

/** En-tête / pied de page communs à tous les emails (équipe + clients). */
export type CrmEmailChrome = {
  enabled: boolean;
  showLogo: boolean;
  showTagline: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showLegal: boolean;
  /** Note libre sous les coordonnées (ex. horaires, mention courte). */
  footerNote: string;
};

import type { SitePublicSettings } from "@/lib/site-public-types";

export type CrmSettingsPayload = {
  branding: CrmBranding;
  emailTemplates: Record<string, CrmEmailTemplate>;
  emailChrome: CrmEmailChrome;
  sitePublic?: SitePublicSettings;
  updatedAt: string | null;
};

export const DEFAULT_CRM_BRANDING: CrmBranding = {
  agencyName: "SD CREATIV",
  tagline: "Agence Web & Solutions Digitales",
  primaryColor: "#1e40af",
  accentColor: "#e85d04",
  logoUrl: null,
};

export const DEFAULT_CRM_EMAIL_CHROME: CrmEmailChrome = {
  enabled: true,
  showLogo: true,
  showTagline: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showLegal: true,
  footerNote: "",
};

export function mergeEmailChrome(
  stored: Partial<CrmEmailChrome> | null | undefined,
): CrmEmailChrome {
  return {
    ...DEFAULT_CRM_EMAIL_CHROME,
    ...(stored ?? {}),
    footerNote:
      typeof stored?.footerNote === "string"
        ? stored.footerNote
        : DEFAULT_CRM_EMAIL_CHROME.footerNote,
  };
}
