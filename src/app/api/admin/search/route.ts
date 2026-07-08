import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getRolePermissions } from "@/lib/crm-permissions";
import { searchCrm } from "@/lib/crm-search";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  const authError = await crmApiAuth.search();
  if (authError) return authError;

  const session = await getAdminSession();
  const permissions = session ? getRolePermissions(session.role) : [];

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 12), 20);
    const results = await searchCrm(q, limit, permissions);
    return NextResponse.json({ results, query: q.trim() });
  } catch (error) {
    console.error("[api/admin/search] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
