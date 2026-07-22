import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listCrmDocRevisions } from "@/lib/crm-docs-revisions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ revisions: [] });
  }

  try {
    const { id } = await params;
    const revisions = await listCrmDocRevisions(id);
    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("[api/admin/crm-docs/revisions] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
