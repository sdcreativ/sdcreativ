import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listCrmAuditLogs } from "@/lib/crm-audit";

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ permission: "audit.view" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const logs = await listCrmAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[api/admin/audit-logs] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
