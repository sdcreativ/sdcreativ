import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createLeadActivity, listLeadActivities } from "@/lib/lead-activities";
import { getLeadById } from "@/lib/leads";

type RouteContext = { params: Promise<{ id: string }> };

const noteSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  subject: z.string().trim().max(200).optional().nullable(),
});

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const lead = await getLeadById(id);
    if (!lead) return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });

    const activities = await listLeadActivities(id);
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("[api/admin/leads/activities] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

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
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const session = await getAdminSession();
    const activity = await createLeadActivity({
      leadId: id,
      type: "note",
      content: parsed.data.content,
      subject: parsed.data.subject,
      actorName: session?.name ?? null,
    });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/leads/activities] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
