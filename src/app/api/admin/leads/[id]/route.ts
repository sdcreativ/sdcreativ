import { NextResponse } from "next/server";
import { requireAdminAuth, getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createLeadActivity } from "@/lib/lead-activities";
import { deleteLead, getLeadById, updateLead, updateLeadSchema } from "@/lib/leads";
import { LEAD_STATUS_LABELS } from "@/content/leads-labels";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const lead = await getLeadById(id);

    if (!lead) {
      return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[api/admin/leads/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getLeadById(id);
    if (!existing) {
      return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const lead = await updateLead(id, parsed.data);

    if (!lead) {
      return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    }

    const session = await getAdminSession();
    const actorName = session?.name ?? null;

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await createLeadActivity({
        leadId: id,
        type: "status_change",
        content: `${LEAD_STATUS_LABELS[existing.status]} → ${LEAD_STATUS_LABELS[parsed.data.status]}`,
        actorName,
      });
    }

    if (parsed.data.assignee !== undefined && parsed.data.assignee !== existing.assignee) {
      await createLeadActivity({
        leadId: id,
        type: "assignee_change",
        content: existing.assignee
          ? `${existing.assignee} → ${parsed.data.assignee || "Non assigné"}`
          : `Assigné à ${parsed.data.assignee || "personne"}`,
        actorName,
      });
    }

    if (parsed.data.status === "signed") {
      const { createClientFromLead } = await import("@/lib/clients");
      void createClientFromLead(id);
    }

    return NextResponse.json({ lead });
  } catch (error) {
    console.error("[api/admin/leads/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteLead(id);

    if (!deleted) {
      return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/leads/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
