import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listDeals } from "@/lib/deals";

export async function GET(request: Request) {
  const authError = await crmApiAuth.deals.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("q") ?? undefined;
    const scope = searchParams.get("scope");
    const session = await getAdminSession();

    let assigneeId: string | undefined;
    if (scope === "mine" && session?.userId) {
      assigneeId = session.userId;
    } else if (searchParams.get("assigneeId")) {
      assigneeId = searchParams.get("assigneeId")!;
    }

    const deals = await listDeals({ assigneeId, search });
    return NextResponse.json({ deals });
  } catch (error) {
    console.error("[api/admin/deals] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
