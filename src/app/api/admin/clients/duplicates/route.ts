import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { findDuplicateClientGroups } from "@/lib/clients";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const groups = await findDuplicateClientGroups();
    return NextResponse.json({ groups, count: groups.length });
  } catch (error) {
    console.error("[api/admin/clients/duplicates] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
