import { z } from "zod";
import { EMAIL_TEMPLATES } from "@/content/settings-labels";
import { withDb } from "@/lib/db";
import {
  DEFAULT_CRM_BRANDING,
  type CrmBranding,
  type CrmEmailTemplate,
  type CrmSettingsPayload,
} from "@/lib/crm-settings-types";

type SettingsRow = {
  branding: CrmBranding | null;
  email_templates: Record<string, CrmEmailTemplate> | null;
  updated_at: Date | null;
};

function defaultEmailTemplates(): Record<string, CrmEmailTemplate> {
  const map: Record<string, CrmEmailTemplate> = {};
  for (const tpl of EMAIL_TEMPLATES) {
    map[tpl.id] = {
      id: tpl.id,
      label: tpl.label,
      description: tpl.description,
      subject: tpl.subjectPattern,
      htmlBody: `<p>Bonjour {{name}},</p><p>${tpl.description}</p><p>— {{agencyName}}</p>`,
    };
  }
  return map;
}

function mergeTemplates(stored: Record<string, CrmEmailTemplate> | null): Record<string, CrmEmailTemplate> {
  const defaults = defaultEmailTemplates();
  if (!stored) return defaults;
  const merged = { ...defaults };
  for (const [id, tpl] of Object.entries(stored)) {
    merged[id] = { ...defaults[id], ...tpl, id };
  }
  return merged;
}

export const updateBrandingSchema = z.object({
  agencyName: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200),
  primaryColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (value) => {
        if (!value) return true;
        if (value.startsWith("/")) return value.length > 1;
        return z.string().url().safeParse(value).success;
      },
      { message: "URL absolue ou chemin relatif (/…)" },
    ),
});

export const updateEmailTemplateSchema = z.object({
  id: z.string().trim().min(1).max(50),
  subject: z.string().trim().min(1).max(255),
  htmlBody: z.string().trim().min(1).max(20000),
});

export const testEmailTemplateSchema = z.object({
  templateId: z.string().trim().min(1).max(50),
  to: z.string().trim().email().max(255),
});

export async function getCrmSettings(): Promise<CrmSettingsPayload> {
  return withDb(async (query) => {
    const { rows } = await query<SettingsRow>(
      `SELECT branding, email_templates, updated_at FROM crm_settings WHERE id = 1`,
    );
    const row = rows[0];
    return {
      branding: { ...DEFAULT_CRM_BRANDING, ...(row?.branding ?? {}) },
      emailTemplates: mergeTemplates(row?.email_templates ?? null),
      updatedAt: row?.updated_at?.toISOString() ?? null,
    };
  });
}

export async function updateCrmBranding(input: z.infer<typeof updateBrandingSchema>): Promise<CrmBranding> {
  return withDb(async (query) => {
    const branding: CrmBranding = {
      agencyName: input.agencyName,
      tagline: input.tagline,
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      logoUrl: input.logoUrl ?? null,
    };
    await query(
      `INSERT INTO crm_settings (id, branding, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET branding = $1, updated_at = NOW()`,
      [JSON.stringify(branding)],
    );
    return branding;
  });
}

export async function updateCrmEmailTemplate(
  input: z.infer<typeof updateEmailTemplateSchema>,
): Promise<CrmEmailTemplate> {
  return withDb(async (query) => {
    const { rows } = await query<SettingsRow>(
      `SELECT branding, email_templates, updated_at FROM crm_settings WHERE id = 1`,
    );
    const templates = mergeTemplates(rows[0]?.email_templates ?? null);
    const existing = templates[input.id];
    if (!existing) throw new Error("Modèle introuvable.");

    const updated: CrmEmailTemplate = {
      ...existing,
      subject: input.subject,
      htmlBody: input.htmlBody,
    };
    templates[input.id] = updated;

    await query(
      `INSERT INTO crm_settings (id, email_templates, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET email_templates = $1, updated_at = NOW()`,
      [JSON.stringify(templates)],
    );
    return updated;
  });
}

export function renderEmailTemplate(
  template: CrmEmailTemplate,
  branding: CrmBranding,
  vars: Record<string, string>,
): { subject: string; html: string } {
  const allVars = {
    agencyName: branding.agencyName,
    name: "Jean Dupont",
    service: "Site vitrine",
    projet: "Refonte site web",
    poste: "Développeur web",
    email: "test@example.com",
    ...vars,
  };

  let subject = template.subject;
  let html = template.htmlBody;
  for (const [key, value] of Object.entries(allVars)) {
    const re = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(re, value);
    html = html.replace(re, value);
  }
  return { subject, html };
}
