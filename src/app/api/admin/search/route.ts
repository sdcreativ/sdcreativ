import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { searchCrm } from "@/lib/crm-search";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? 12), 20);
    const results = await searchCrm(q, limit);
    return NextResponse.json({ results, query: q.trim() });
  } catch (error) {
    console.error("[api/admin/search] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
