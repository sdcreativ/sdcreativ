import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteServiceCatalogItem,
  getServiceCatalogItemById,
  updateServiceCatalogItem,
  updateServiceCatalogSchema,
} from "@/lib/service-catalog";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const item = await getServiceCatalogItemById(id);
    if (!item) {
      return NextResponse.json({ error: "Prestation introuvable." }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[api/admin/service-catalog/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateServiceCatalogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const item = await updateServiceCatalogItem(id, parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Prestation introuvable." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[api/admin/service-catalog/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteServiceCatalogItem(id);
    if (!deleted) {
      return NextResponse.json({ error: "Prestation introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/service-catalog/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
