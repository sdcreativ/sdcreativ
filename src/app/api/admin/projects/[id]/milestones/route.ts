import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  addProjectMilestone,
  createMilestoneSchema,
  getProjectById,
  listProjectMilestones,
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

    const milestones = await listProjectMilestones(id);
    return NextResponse.json({ milestones });
  } catch (error) {
    console.error("[api/admin/projects/milestones] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.projects.write();
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

    const body = await request.json();
    const parsed = createMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const milestone = await addProjectMilestone(id, parsed.data);
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/projects/milestones] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
