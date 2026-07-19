import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  ArchiveWorkflowError,
  archiveProjectDossier,
  getProjectArchiveDetail,
} from "@/lib/projects/archive";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const detail = await getProjectArchiveDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof ArchiveWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[api/admin/projects/[id]/archive] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(_request: Request, context: Ctx) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { id } = await context.params;
    const result = await archiveProjectDossier({
      projectId: id,
      actor: {
        userId: session.userId === "legacy" ? null : session.userId,
        name: session.name,
        email: session.email,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ArchiveWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/projects/[id]/archive] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
