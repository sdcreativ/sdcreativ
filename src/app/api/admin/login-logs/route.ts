import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listAdminLoginLogs } from "@/lib/crm-login-logs";

export async function GET(request: Request) {
  const authError = await requireAdminAuth({ roles: ["admin"] });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 50;
    const logs = await listAdminLoginLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[api/admin/login-logs] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
