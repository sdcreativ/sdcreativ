export const SITE = {
  name: "SD CREATIV",
  tagline: "Création de sites web & solutions digitales",
  description:
    "Agence web à Abidjan : sites vitrines, e-commerce, agents IA, automatisation, DevOps, cloud, SEO local et identité visuelle pour PME et entrepreneurs.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com",
  locale: "fr_CI",
} as const;

/** Logo officiel SD CREATIV (SVG). */
export const LOGO = {
  src: "/images/logo_sd.svg",
  width: 1200,
  height: 675,
} as const;

/** Logo PNG coloré — footer sur fond sombre. */
export const LOGO_FOOTER = {
  src: "/images/logo.png",
  width: 360,
  height: 72,
} as const;

const phoneDisplay =
  process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+225 07 00 00 00 00";
const phoneDigits = phoneDisplay.replace(/\D/g, "");

export const CONTACT = {
  phone: phoneDisplay,
  phoneHref: `tel:+${phoneDigits}`,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@sdcreativ.com",
  address:
    process.env.NEXT_PUBLIC_CONTACT_ADDRESS ?? "Abidjan, Côte d'Ivoire",
  hours: process.env.NEXT_PUBLIC_CONTACT_HOURS ?? "Lun – Ven : 8h – 18h",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? phoneDigits,
  whatsappMessage:
    "Bonjour SD CREATIV, je souhaite discuter de mon projet web.",
} as const;

export const SOCIAL = {
  facebook:
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ?? "https://facebook.com/sdcreativ",
  linkedin:
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ??
    "https://linkedin.com/company/sdcreativ",
  instagram:
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ??
    "https://instagram.com/sdcreativ",
  youtube:
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "https://youtube.com/@sdcreativ",
} as const;

export const ANALYTICS = {
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "",
} as const;

function normalizePublicUrl(raw: string | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export const BOOKING = {
  /** Lien Cal.com ou Calendly — ex. https://cal.com/sdcreativ/30min */
  url: normalizePublicUrl(process.env.NEXT_PUBLIC_BOOKING_URL),
  /** URL embed iframe (optionnel) — ex. https://cal.com/sdcreativ/30min?embed=true */
  embedUrl: normalizePublicUrl(process.env.NEXT_PUBLIC_BOOKING_EMBED_URL),
  label: "Réserver un appel de 30 min",
} as const;

/** Informations légales affichées sur mentions-legales (compléter en production). */
export const LEGAL = {
  rccm: process.env.NEXT_PUBLIC_LEGAL_RCCM ?? "",
  ncc: process.env.NEXT_PUBLIC_LEGAL_NCC ?? "",
  hostName:
    process.env.NEXT_PUBLIC_HOST_NAME ?? "Hostinger International Ltd.",
  hostAddress:
    process.env.NEXT_PUBLIC_HOST_ADDRESS ??
    "61 Lordou Vironos Street, 6023 Larnaca, Chypre",
} as const;

export function whatsappUrl(message = CONTACT.whatsappMessage) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${CONTACT.whatsapp.replace(/\D/g, "")}?text=${encoded}`;
}
