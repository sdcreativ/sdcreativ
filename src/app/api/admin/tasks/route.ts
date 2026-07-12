import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createTask, createTaskSchema, listTasks } from "@/lib/tasks";
import type { TaskStatus } from "@/content/tasks-labels";
import { notifyTaskAssignee } from "@/lib/task-notifications";

export async function GET(request: Request) {
  const authError = await crmApiAuth.tasks.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const assignee = searchParams.get("assignee");
    const projectId = searchParams.get("projectId");
    const q = searchParams.get("q");

    const tasks = await listTasks({
      status: status ?? undefined,
      assignee: assignee ?? undefined,
      projectId: projectId ?? undefined,
      q: q ?? undefined,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("[api/admin/tasks] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.tasks.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const task = await createTask(parsed.data);
    if (task.assignee) {
      const session = await getAdminSession();
      void notifyTaskAssignee(task, "assigned", { actorName: session?.name }).catch((err) => {
        console.error("[api/admin/tasks] notify assignee", err);
      });
    }
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/tasks] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
