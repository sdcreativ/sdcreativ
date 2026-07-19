import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createProject,
  createProjectSchema,
  listProjectsPaginated,
  type ProjectListFilters,
} from "@/lib/projects";
import type { ProjectStatus } from "@/content/projects-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as ProjectStatus | null;
    const assignee = searchParams.get("assignee")?.trim() || undefined;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;
    const archivedParam = searchParams.get("archived");
    const archived: ProjectListFilters["archived"] =
      archivedParam === "1" || archivedParam === "true"
        ? true
        : archivedParam === "all"
          ? "all"
          : false;

    const filters: ProjectListFilters = {
      status: status ?? undefined,
      assignee,
      clientId,
      q,
      archived,
      page,
      pageSize,
    };

    const result = await listProjectsPaginated(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/projects] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.projects.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const project = await createProject(parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/projects] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
