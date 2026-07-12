import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createQuoteTemplate,
  createQuoteTemplateSchema,
  listQuoteTemplates,
} from "@/lib/quote-templates";

export async function GET(request: Request) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1";
    const templates = await listQuoteTemplates({ activeOnly });
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[api/admin/quote-templates] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createQuoteTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const template = await createQuoteTemplate(parsed.data);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/quote-templates] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
