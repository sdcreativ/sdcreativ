import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { auditCrmAction, usersManageAuth } from "@/lib/crm-audit-actions";
import {
  createCrmUser,
  createCrmUserSchema,
  listCrmUsers,
} from "@/lib/crm-users";

export async function GET() {
  const authError = await usersManageAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const users = await listCrmUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("[api/admin/users] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await usersManageAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createCrmUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { user, invitationSent } = await createCrmUser(parsed.data);
    await auditCrmAction({
      action: "create",
      entityType: "user",
      entityId: user.id,
      summary: `Utilisateur créé : ${user.name} (${user.email})`,
      metadata: { role: user.role, invitationSent },
    });
    return NextResponse.json({ user, invitationSent }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/users] POST", error);
    const message = error instanceof Error && error.message.includes("unique")
      ? "Cet email est déjà utilisé."
      : "Erreur serveur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
