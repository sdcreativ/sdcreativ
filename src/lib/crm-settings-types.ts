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

export type CrmSettingsPayload = {
  branding: CrmBranding;
  emailTemplates: Record<string, CrmEmailTemplate>;
  updatedAt: string | null;
};

export const DEFAULT_CRM_BRANDING: CrmBranding = {
  agencyName: "SD CREATIV",
  tagline: "Agence Web & Solutions Digitales",
  primaryColor: "#1e40af",
  accentColor: "#e85d04",
  logoUrl: null,
};
