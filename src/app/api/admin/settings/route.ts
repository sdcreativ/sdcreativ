import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  getCrmSettings,
  updateBrandingSchema,
  updateCrmBranding,
  updateCrmEmailTemplate,
  updateEmailTemplateSchema,
} from "@/lib/crm-settings";
import {
  getSitePublicSettingsForAdmin,
  updateSitePublicSchema,
  updateSitePublicSettings,
} from "@/lib/site-public-settings";
import { revalidateSitePublicPages } from "@/lib/site-revalidate";

const patchSchema = z.object({
  branding: updateBrandingSchema.optional(),
  emailTemplate: updateEmailTemplateSchema.optional(),
  sitePublic: updateSitePublicSchema.optional(),
});

async function auditFromSession(action: string, entityType: string, summary: string, entityId?: string) {
  const session = await getAdminSession();
  if (!session) return;
  await logCrmAudit({
    actor: {
      userId: session.userId === "legacy" ? null : session.userId,
      name: session.name,
      email: session.email,
    },
    action,
    entityType,
    entityId,
    summary,
  });
}

export async function GET() {
  const authError = await crmApiAuth.settingsAccess();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const settings = await getCrmSettings();
    const sitePublic = await getSitePublicSettingsForAdmin();
    return NextResponse.json({ settings: { ...settings, sitePublic } });
  } catch (error) {
    console.error("[api/admin/settings] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    if (parsed.data.branding) {
      const branding = await updateCrmBranding(parsed.data.branding);
      await auditFromSession("update", "branding", `Branding mis à jour (${branding.agencyName})`);
      return NextResponse.json({ branding });
    }

    if (parsed.data.emailTemplate) {
      const template = await updateCrmEmailTemplate(parsed.data.emailTemplate);
      await auditFromSession("update", "email_template", `Modèle email « ${template.label} » modifié`, template.id);
      return NextResponse.json({ template });
    }

    if (parsed.data.sitePublic) {
      const sitePublic = await updateSitePublicSettings(parsed.data.sitePublic);
      revalidateSitePublicPages();
      await auditFromSession("update", "site_public", "Coordonnées et réseaux sociaux du site mis à jour");
      return NextResponse.json({ sitePublic });
    }

    return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  } catch (error) {
    console.error("[api/admin/settings] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
