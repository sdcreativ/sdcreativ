import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listWhatsAppLeadTemplates,
  sendWhatsAppLeadTemplate,
} from "@/lib/whatsapp-templates";
import { getLeadById } from "@/lib/leads";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    return NextResponse.json({
      templates: listWhatsAppLeadTemplates(lead.status),
      phone: lead.phone,
    });
  } catch (error) {
    console.error("[api/admin/leads/whatsapp] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const postSchema = z.object({
  templateId: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(40).optional().nullable(),
});

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.leads.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = postSchema.parse(await request.json());
    const result = await sendWhatsAppLeadTemplate({
      leadId: id,
      templateId: body.templateId,
      phoneOverride: body.phone,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "Envoi WhatsApp échoué.", ...result },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    console.error("[api/admin/leads/whatsapp] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Envoi impossible." },
      { status: 400 },
    );
  }
}
