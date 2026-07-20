import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { issueVendorPoPortalLink } from "@/lib/vendor-portal";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.vendors.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const link = await issueVendorPoPortalLink(id);
    return NextResponse.json({ success: true, ...link });
  } catch (error) {
    console.error("[api/admin/vendors/portal-link] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lien impossible." },
      { status: 400 },
    );
  }
}
