import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createCrmRole,
  createCrmRoleSchema,
  listCrmRoles,
  refreshCrmRolesCache,
} from "@/lib/crm-roles-db";

export async function GET() {
  const authError = await crmApiAuth.users.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    await refreshCrmRolesCache();
    const roles = await listCrmRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("[api/admin/roles] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.users.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createCrmRoleSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const role = await createCrmRole(parsed.data);
    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/roles] POST", error);
    const msg = error instanceof Error && error.message.includes("unique") 
      ? "Ce slug de rôle existe déjà." 
      : "Erreur serveur.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
