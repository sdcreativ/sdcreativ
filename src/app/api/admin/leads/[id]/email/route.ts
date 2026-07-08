import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { createLeadActivity } from "@/lib/lead-activities";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getLeadById } from "@/lib/leads";

type RouteContext = { params: Promise<{ id: string }> };

const emailSchema = z.object({
  subject: z.string().trim().min(2).max(200),
  body: z.string().trim().min(1).max(10000),
});

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.leads.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });

    const body = await request.json();
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const session = await getAdminSession();
    const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";
    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827">
        ${parsed.data.body.split("\n").map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
        <p style="font-size:12px;color:#6b7280">SD CREATIV — ${escapeHtml(fromEmail)}</p>
      </div>`;

    const sent = await sendEmail({
      to: lead.email,
      subject: parsed.data.subject,
      html,
      replyTo: fromEmail,
    });

    if (!sent) {
      return NextResponse.json({ error: "Échec de l'envoi email." }, { status: 502 });
    }

    const activity = await createLeadActivity({
      leadId: id,
      type: "email_sent",
      subject: parsed.data.subject,
      content: parsed.data.body,
      actorName: session?.name ?? null,
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("[api/admin/leads/email] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
