import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { restoreCrmDocRevision } from "@/lib/crm-docs-revisions";

type Params = { params: Promise<{ id: string; revisionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.docs.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id, revisionId } = await params;
    const session = await getAdminSession();
    const page = await restoreCrmDocRevision(id, revisionId, {
      name: session?.name,
      email: session?.email,
    });
    if (!page) {
      return NextResponse.json({ error: "Révision introuvable." }, { status: 404 });
    }
    return NextResponse.json({ page });
  } catch (error) {
    console.error("[api/admin/crm-docs/revisions/restore]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
