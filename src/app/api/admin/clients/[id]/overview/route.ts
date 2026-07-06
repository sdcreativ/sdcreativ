import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getClientOverview } from "@/lib/clients";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const overview = await getClientOverview(id);
    return NextResponse.json({ overview });
  } catch (error) {
    console.error("[api/admin/clients/[id]/overview] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
