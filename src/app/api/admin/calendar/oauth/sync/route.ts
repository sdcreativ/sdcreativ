import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";
import { syncCalendarOAuthForUser } from "@/lib/calendar-sync";
import { isDatabaseConfigured } from "@/lib/db";

const bodySchema = z.object({
  provider: z.enum(["google", "microsoft"]).optional(),
});

export async function POST(request: Request) {
  const authError = await requireAdminAuth({ write: true });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({ error: "Compte CRM requis pour la sync OAuth." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    }

    const result = await syncCalendarOAuthForUser(
      session.userId,
      parsed.data.provider as CalendarOAuthProvider | undefined,
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[api/admin/calendar/oauth/sync] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
