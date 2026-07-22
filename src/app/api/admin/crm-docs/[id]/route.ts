import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getCrmDocPageById,
  softDeleteCrmDocPage,
  updateCrmDocPage,
} from "@/lib/crm-docs";
import { updateCrmDocPageSchema } from "@/lib/crm-docs-types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const page = await getCrmDocPageById(id);
    if (!page) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
    return NextResponse.json({ page });
  } catch (error) {
    console.error("[api/admin/crm-docs/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCrmDocPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const session = await getAdminSession();
    const page = await updateCrmDocPage(id, parsed.data, {
      author: { name: session?.name, email: session?.email },
    });
    if (!page) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
    return NextResponse.json({ page });
  } catch (error) {
    console.error("[api/admin/crm-docs/[id]] PATCH", error);
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
    const ok = await softDeleteCrmDocPage(id);
    if (!ok) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/crm-docs/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
