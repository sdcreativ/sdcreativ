import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteCrmDocCategory,
  updateCrmDocCategory,
} from "@/lib/crm-docs-categories";
import { updateCrmDocCategorySchema } from "@/lib/crm-docs-types";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCrmDocCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const category = await updateCrmDocCategory(id, parsed.data);
    if (!category) {
      return NextResponse.json({ error: "Catégorie introuvable." }, { status: 404 });
    }
    return NextResponse.json({ category });
  } catch (error) {
    console.error("[api/admin/crm-doc-categories/[id]] PATCH", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await deleteCrmDocCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/crm-doc-categories/[id]] DELETE", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
