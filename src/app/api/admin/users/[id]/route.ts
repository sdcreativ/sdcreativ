import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { auditCrmAction, usersManageAuth } from "@/lib/crm-audit-actions";
import { deleteCrmUser, updateCrmUser, updateCrmUserSchema } from "@/lib/crm-users";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await usersManageAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateCrmUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const user = await updateCrmUser(id, parsed.data);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    await auditCrmAction({
      action: "update",
      entityType: "user",
      entityId: user.id,
      summary: `Utilisateur modifié : ${user.name}`,
      metadata: parsed.data,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[api/admin/users/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await usersManageAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const deleted = await deleteCrmUser(id);
    if (!deleted) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    await auditCrmAction({
      action: "delete",
      entityType: "user",
      entityId: id,
      summary: `Utilisateur supprimé`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/users/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
