import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteCrmRole,
  updateCrmRole,
  updateCrmRoleSchema,
} from "@/lib/crm-roles-db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.users.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateCrmRoleSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const role = await updateCrmRole(id, parsed.data);
    if (!role) {
      return NextResponse.json({ error: "Rôle introuvable." }, { status: 404 });
    }
    return NextResponse.json({ role });
  } catch (error) {
    console.error("[api/admin/roles/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.users.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const result = await deleteCrmRole(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Suppression impossible." }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/roles/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
