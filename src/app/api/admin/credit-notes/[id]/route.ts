import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteCreditNote,
  getCreditNoteById,
  updateCreditNote,
  updateCreditNoteSchema,
} from "@/lib/credit-notes";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCreditNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const creditNote = await updateCreditNote(id, parsed.data);
    if (!creditNote) {
      return NextResponse.json({ error: "Avoir introuvable." }, { status: 404 });
    }
    return NextResponse.json({ creditNote });
  } catch (error) {
    console.error("[api/admin/credit-notes/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getCreditNoteById(id);
    if (!existing) {
      return NextResponse.json({ error: "Avoir introuvable." }, { status: 404 });
    }
    const ok = await deleteCreditNote(id);
    if (!ok) {
      return NextResponse.json({ error: "Suppression impossible." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/credit-notes/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
