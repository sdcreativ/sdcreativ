import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { auditCrmAction, usersManageAuth } from "@/lib/crm-audit-actions";
import { getAdminSession } from "@/lib/admin-auth";
import { deleteCrmUser, updateCrmUser, updateCrmUserSchema } from "@/lib/crm-users";
import { withDb } from "@/lib/db";

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

    const session = await getAdminSession();
    if (session?.userId && session.userId !== "legacy") {
      if (parsed.data.active === false && id === session.userId) {
        return NextResponse.json(
          { error: "Impossible de désactiver votre propre compte." },
          { status: 400 },
        );
      }
    }

    // Sécurité : empêcher de désactiver le dernier admin actif.
    if (parsed.data.active === false || (parsed.data.role && parsed.data.role !== "admin")) {
      const existing = await withDb(async (query) => {
        const { rows } = await query<{ role: string; active: boolean }>(
          `SELECT role, active FROM crm_users WHERE id = $1 LIMIT 1`,
          [id],
        );
        return rows[0] ?? null;
      });

      if (existing?.role === "admin" && existing.active) {
        const remainingAdmins = await withDb(async (query) => {
          const { rows } = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count
             FROM crm_users
             WHERE role = 'admin' AND active = true AND id <> $1`,
            [id],
          );
          return Number(rows[0]?.count ?? 0);
        });
        if (remainingAdmins <= 0) {
          return NextResponse.json(
            { error: "Impossible : il doit rester au moins un administrateur actif." },
            { status: 400 },
          );
        }
      }
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
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    if (
      message.includes("déjà utilisé") ||
      message.includes("différent") ||
      message.includes("Rôle invalide")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
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
