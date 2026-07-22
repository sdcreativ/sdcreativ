import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createCrmDocCategory,
  listCrmDocCategories,
} from "@/lib/crm-docs-categories";
import { createCrmDocCategorySchema } from "@/lib/crm-docs-types";

export async function GET() {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ categories: [] });
  }

  try {
    const categories = await listCrmDocCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[api/admin/crm-doc-categories] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createCrmDocCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const category = await createCrmDocCategory(parsed.data);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/crm-doc-categories] POST", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
