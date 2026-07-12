import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createServiceCatalogSchema, createServiceCatalogItem, listServiceCatalogItems } from "@/lib/service-catalog";

export async function GET(request: Request) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "1";
    const items = await listServiceCatalogItems({ activeOnly });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api/admin/service-catalog] GET", error);
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
    const parsed = createServiceCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const item = await createServiceCatalogItem(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/service-catalog] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
