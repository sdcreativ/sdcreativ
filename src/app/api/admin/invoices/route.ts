import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createInvoice,
  createInvoiceFromQuote,
  createInvoiceSchema,
  listInvoices,
} from "@/lib/invoices";

export async function GET() {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const invoices = await listInvoices();
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[api/admin/invoices] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();

    if (body.fromQuoteId) {
      const invoice = await createInvoiceFromQuote(String(body.fromQuoteId));
      if (!invoice) {
        return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
      }
      return NextResponse.json({ invoice }, { status: 201 });
    }

    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const invoice = await createInvoice(parsed.data);
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/invoices] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
