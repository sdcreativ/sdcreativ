import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { logCrmAudit } from "@/lib/crm-audit";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteProject,
  getProjectById,
  updateProject,
  updateProjectSchema,
} from "@/lib/projects";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    console.error("[api/admin/projects/id] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const before = await getProjectById(id);
    const project = await updateProject(id, parsed.data);
    if (!project) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    if (
      before &&
      before.status !== "delivered" &&
      project.status === "delivered"
    ) {
      const session = await getAdminSession();
      void logCrmAudit({
        actor: {
          userId: session?.userId === "legacy" ? null : session?.userId ?? null,
          name: session?.name ?? "Admin",
          email: session?.email ?? null,
        },
        action: "project.delivered",
        entityType: "project",
        entityId: id,
        summary: `Projet « ${project.name} » marqué livré.`,
        metadata: { fromStatus: before.status, toStatus: "delivered" },
      });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("[api/admin/projects/id] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("archivé")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/projects/id] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
