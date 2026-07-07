import type {
  ResolvedSitePublic,
  SiteContactInfo,
  SiteLegalInfo,
  SitePublicSettings,
  SiteSocialLinks,
} from "@/lib/site-public-types";

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name];
  return value?.trim() ? value.trim() : fallback;
}

export function getEnvSitePublicDefaults(): SitePublicSettings {
  const phone = envOrDefault("NEXT_PUBLIC_CONTACT_PHONE", "+225 07 00 00 00 00");
  const phoneDigits = phone.replace(/\D/g, "");

  return {
    phone,
    email: envOrDefault("NEXT_PUBLIC_CONTACT_EMAIL", "contact@sdcreativ.com"),
    address: envOrDefault("NEXT_PUBLIC_CONTACT_ADDRESS", "Abidjan, Côte d'Ivoire"),
    hours: envOrDefault("NEXT_PUBLIC_CONTACT_HOURS", "Lun – Ven : 8h – 18h"),
    whatsapp: envOrDefault("NEXT_PUBLIC_WHATSAPP_NUMBER", phoneDigits),
    whatsappMessage: "Bonjour SD CREATIV, je souhaite discuter de mon projet web.",
    facebook: envOrDefault("NEXT_PUBLIC_SOCIAL_FACEBOOK", "https://facebook.com/sdcreativ"),
    linkedin: envOrDefault(
      "NEXT_PUBLIC_SOCIAL_LINKEDIN",
      "https://linkedin.com/company/sdcreativ",
    ),
    instagram: envOrDefault(
      "NEXT_PUBLIC_SOCIAL_INSTAGRAM",
      "https://instagram.com/sdcreativ",
    ),
    youtube: envOrDefault("NEXT_PUBLIC_SOCIAL_YOUTUBE", "https://youtube.com/@sdcreativ"),
    rccm: envOrDefault("NEXT_PUBLIC_LEGAL_RCCM", ""),
    ncc: envOrDefault("NEXT_PUBLIC_LEGAL_NCC", ""),
    hostName: envOrDefault("NEXT_PUBLIC_HOST_NAME", "Hostinger International Ltd."),
    hostAddress: envOrDefault(
      "NEXT_PUBLIC_HOST_ADDRESS",
      "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
    ),
  };
}

function buildContact(raw: SitePublicSettings): SiteContactInfo {
  const phoneDigits = raw.phone.replace(/\D/g, "");
  return {
    phone: raw.phone,
    phoneHref: `tel:+${phoneDigits}`,
    email: raw.email,
    address: raw.address,
    hours: raw.hours,
    whatsapp: raw.whatsapp,
    whatsappMessage: raw.whatsappMessage,
  };
}

function buildSocial(raw: SitePublicSettings): SiteSocialLinks {
  return {
    facebook: raw.facebook,
    linkedin: raw.linkedin,
    instagram: raw.instagram,
    youtube: raw.youtube,
  };
}

function buildLegal(raw: SitePublicSettings): SiteLegalInfo {
  return {
    rccm: raw.rccm,
    ncc: raw.ncc,
    hostName: raw.hostName,
    hostAddress: raw.hostAddress,
  };
}

export function resolveSitePublic(
  stored: Partial<SitePublicSettings> | null | undefined,
): ResolvedSitePublic {
  const defaults = getEnvSitePublicDefaults();
  const hasStored = Boolean(stored && Object.keys(stored).length > 0);
  const merged: SitePublicSettings = hasStored ? { ...defaults, ...stored } : defaults;

  return {
    contact: buildContact(merged),
    social: buildSocial(merged),
    legal: buildLegal(merged),
    fromDatabase: hasStored,
  };
}

export function buildWhatsappUrl(
  contact: SiteContactInfo,
  message = contact.whatsappMessage,
): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}?text=${encoded}`;
}
