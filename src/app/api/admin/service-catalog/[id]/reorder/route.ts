import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { reorderServiceCatalogItem } from "@/lib/service-catalog";

type RouteContext = { params: Promise<{ id: string }> };

const reorderSchema = z.object({
  direction: z.enum(["up", "down"]),
});

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const item = await reorderServiceCatalogItem(id, parsed.data.direction);
    if (!item) {
      return NextResponse.json({ error: "Prestation introuvable." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[api/admin/service-catalog/id/reorder] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
