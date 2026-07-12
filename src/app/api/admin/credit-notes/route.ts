import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createCreditNote,
  createCreditNoteSchema,
  listCreditNotes,
} from "@/lib/credit-notes";

export async function GET(request: Request) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const invoiceId = searchParams.get("invoiceId") ?? undefined;
    const creditNotes = await listCreditNotes({ clientId, invoiceId });
    return NextResponse.json({ creditNotes });
  } catch (error) {
    console.error("[api/admin/credit-notes] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createCreditNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const creditNote = await createCreditNote(parsed.data);
    return NextResponse.json({ creditNote }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/credit-notes] POST", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
