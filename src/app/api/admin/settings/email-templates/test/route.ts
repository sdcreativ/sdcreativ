import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import { sendEmailDetailed } from "@/lib/email";
import {
  getCrmSettings,
  renderEmailTemplate,
  testEmailTemplateSchema,
} from "@/lib/crm-settings";

export async function POST(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = testEmailTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const settings = await getCrmSettings();
    const template = settings.emailTemplates[parsed.data.templateId];
    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
    }

    const session = await getAdminSession();
    const vars: Record<string, string> = {};
    if (session?.name?.trim()) {
      vars.name = session.name.trim().split(/\s+/)[0] ?? session.name.trim();
    }
    if (session?.email?.trim()) {
      vars.email = session.email.trim();
    }

    const { getEmailLogoTemplateVars } = await import("@/lib/email-logo");
    const logoVars = await getEmailLogoTemplateVars();
    vars.logo = logoVars.logo;
    vars.logoUrl = logoVars.logoUrl;

    const { subject, html } = renderEmailTemplate(template, settings.branding, vars);

    const result = await sendEmailDetailed({
      subject: `[TEST CRM] ${subject}`,
      html: `<p><em>Envoi test depuis les paramètres CRM.</em></p>${html}`,
      to: parsed.data.to,
      attachments: logoVars.logoAttachment
        ? [
            {
              filename: logoVars.logoAttachment.filename,
              content: logoVars.logoAttachment.content,
              contentId: logoVars.logoAttachment.contentId,
            },
          ]
        : undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Envoi impossible." },
        { status: result.status === 403 ? 403 : 502 },
      );
    }

    if (session) {
      await logCrmAudit({
        actor: {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        },
        action: "test_email",
        entityType: "email_template",
        entityId: template.id,
        summary: `Envoi test du modèle « ${template.label} » à ${parsed.data.to}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/settings/email-templates/test] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
