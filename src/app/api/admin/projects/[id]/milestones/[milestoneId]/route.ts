import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  deleteProjectMilestone,
  updateProjectMilestone,
  updateMilestoneSchema,
} from "@/lib/projects";

type Props = {
  params: Promise<{ id: string; milestoneId: string }>;
};

export async function PATCH(request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { milestoneId } = await params;
    const body = await request.json();
    const parsed = updateMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const milestone = await updateProjectMilestone(milestoneId, parsed.data);
    if (!milestone) {
      return NextResponse.json({ error: "Jalon introuvable." }, { status: 404 });
    }

    return NextResponse.json({ milestone });
  } catch (error) {
    console.error("[api/admin/projects/milestone] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { milestoneId } = await params;
    const deleted = await deleteProjectMilestone(milestoneId);
    if (!deleted) {
      return NextResponse.json({ error: "Jalon introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/projects/milestone] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
