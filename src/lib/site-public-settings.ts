import { cache } from "react";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { resolveSitePublic } from "@/lib/site-public-resolver";
import type { ResolvedSitePublic, SitePublicSettings } from "@/lib/site-public-types";

export const SITE_PUBLIC_SETTINGS_TAG = "site-public-settings";

type SitePublicRow = {
  site_public: Partial<SitePublicSettings> | null;
};

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || z.string().url().safeParse(v).success, {
    message: "URL invalide",
  });

export const updateSitePublicSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || v.startsWith("/") || z.string().url().safeParse(v).success, {
      message: "URL ou chemin invalide",
    }),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(255),
  address: z.string().trim().min(2).max(300),
  hours: z.string().trim().min(2).max(120),
  whatsapp: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^\d+$/, "Numéro WhatsApp (chiffres uniquement)"),
  whatsappMessage: z.string().trim().min(1).max(500),
  facebook: optionalUrl,
  linkedin: optionalUrl,
  instagram: optionalUrl,
  youtube: optionalUrl,
  rccm: z.string().trim().max(120),
  ncc: z.string().trim().max(120),
  hostName: z.string().trim().min(1).max(200),
  hostAddress: z.string().trim().max(300),
  // Papier à en-tête : champ vide = valeur du modèle Word.
  legalName: z.string().trim().max(120).default(""),
  legalForm: z.string().trim().max(200).default(""),
  headOffice: z.string().trim().max(300).default(""),
  idu: z.string().trim().max(120).default(""),
  letterheadTagline: z.string().trim().max(120).default(""),
  letterheadWebsite: z.string().trim().max(120).default(""),
  letterheadEmail: z.union([z.literal(""), z.string().trim().email().max(255)]).default(""),
  letterheadPhone: z.string().trim().max(40).default(""),
  letterheadPhone2: z.string().trim().max(40).default(""),
});

async function loadSitePublicSettings(): Promise<ResolvedSitePublic> {
  if (!isDatabaseConfigured()) {
    return resolveSitePublic(null);
  }

  try {
    return await withDb(async (query) => {
      const { rows } = await query<SitePublicRow>(
        `SELECT site_public FROM crm_settings WHERE id = 1`,
      );
      return resolveSitePublic(rows[0]?.site_public ?? null);
    });
  } catch {
    return resolveSitePublic(null);
  }
}

/** Settings publics — cache taggé (évite force-dynamic via connection()). */
export const getSitePublicSettings = cache(async (): Promise<ResolvedSitePublic> => {
  return unstable_cache(loadSitePublicSettings, ["site-public-settings"], {
    tags: [SITE_PUBLIC_SETTINGS_TAG],
    revalidate: 300,
  })();
});

export async function getSitePublicSettingsForAdmin(): Promise<SitePublicSettings> {
  const resolved = await loadSitePublicSettings();
  return {
    companyName: resolved.companyName,
    tagline: resolved.tagline,
    logoUrl: resolved.logoUrl,
    phone: resolved.contact.phone,
    email: resolved.contact.email,
    address: resolved.contact.address,
    hours: resolved.contact.hours,
    whatsapp: resolved.contact.whatsapp,
    whatsappMessage: resolved.contact.whatsappMessage,
    facebook: resolved.social.facebook,
    linkedin: resolved.social.linkedin,
    instagram: resolved.social.instagram,
    youtube: resolved.social.youtube,
    // Le formulaire affiche le RCCM réellement imprimé sur les documents.
    rccm: resolved.legal.rccm || resolved.letterhead.rccm,
    ncc: resolved.legal.ncc,
    hostName: resolved.legal.hostName,
    hostAddress: resolved.legal.hostAddress,
    legalName: resolved.letterhead.legalName,
    legalForm: resolved.letterhead.legalForm,
    headOffice: resolved.letterhead.headOffice,
    idu: resolved.letterhead.idu,
    letterheadTagline: resolved.letterhead.tagline,
    letterheadWebsite: resolved.letterhead.website,
    letterheadEmail: resolved.letterhead.email,
    letterheadPhone: resolved.letterhead.phones[0] ?? "",
    letterheadPhone2: resolved.letterhead.phones[1] ?? "",
  };
}

export async function updateSitePublicSettings(
  input: z.infer<typeof updateSitePublicSchema>,
): Promise<SitePublicSettings> {
  const data = updateSitePublicSchema.parse(input);

  await withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, site_public, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET site_public = $1, updated_at = NOW()`,
      [JSON.stringify(data)],
    );
  });

  return data;
}

export { getEnvSitePublicDefaults, resolveSitePublic, buildWhatsappUrl } from "@/lib/site-public-resolver";
