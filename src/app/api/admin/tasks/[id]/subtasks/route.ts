import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getTaskById } from "@/lib/tasks";
import {
  createSubtaskSchema,
  createTaskSubtask,
  listTaskSubtasks,
} from "@/lib/task-subtasks";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const task = await getTaskById(id);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });

    const subtasks = await listTaskSubtasks(id);
    return NextResponse.json({ subtasks });
  } catch (error) {
    console.error("[api/admin/tasks/subtasks] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const task = await getTaskById(id);
    if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });

    const body = await request.json();
    const parsed = createSubtaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const subtask = await createTaskSubtask(id, parsed.data);
    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/tasks/subtasks] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
