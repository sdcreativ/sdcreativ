import { cache } from "react";
import { connection } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { resolveSitePublic } from "@/lib/site-public-resolver";
import type { ResolvedSitePublic, SitePublicSettings } from "@/lib/site-public-types";

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
});

export const getSitePublicSettings = cache(async (): Promise<ResolvedSitePublic> => {
  await connection();

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
});

export async function getSitePublicSettingsForAdmin(): Promise<SitePublicSettings> {
  const resolved = await getSitePublicSettings();
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
    rccm: resolved.legal.rccm,
    ncc: resolved.legal.ncc,
    hostName: resolved.legal.hostName,
    hostAddress: resolved.legal.hostAddress,
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
