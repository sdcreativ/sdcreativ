import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteTimeEntry,
  getTimeEntryById,
  updateTimeEntry,
  updateTimeEntrySchema,
} from "@/lib/time-entries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.timesheets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const entry = await updateTimeEntry(id, parsed.data);
    if (!entry) {
      return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("[api/admin/time-entries/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.timesheets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getTimeEntryById(id);
    if (!existing) {
      return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
    }
    await deleteTimeEntry(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/time-entries/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
