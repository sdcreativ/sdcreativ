import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getCrmNavBadges } from "@/lib/crm-nav-badges-server";
import { getRolePermissions } from "@/lib/crm-permissions";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const permissions = getRolePermissions(session.role);
    const badges = await getCrmNavBadges(
      permissions,
      session.userId === "legacy" ? null : session.userId,
    );

    return NextResponse.json({ badges });
  } catch (error) {
    console.error("[api/admin/nav-badges] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
