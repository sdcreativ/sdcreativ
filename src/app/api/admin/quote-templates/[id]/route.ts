import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteQuoteTemplate,
  getQuoteTemplateById,
  updateQuoteTemplate,
  updateQuoteTemplateSchema,
} from "@/lib/quote-templates";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const template = await getQuoteTemplateById(id);
    if (!template) {
      return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
    }
    return NextResponse.json({ template });
  } catch (error) {
    console.error("[api/admin/quote-templates/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateQuoteTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const template = await updateQuoteTemplate(id, parsed.data);
    return NextResponse.json({ template });
  } catch (error) {
    console.error("[api/admin/quote-templates/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await deleteQuoteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/quote-templates/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
