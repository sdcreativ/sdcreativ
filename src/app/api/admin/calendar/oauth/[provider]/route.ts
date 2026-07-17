import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import {
  CALENDAR_OAUTH_PROVIDERS,
  type CalendarOAuthProvider,
} from "@/lib/calendar-oauth-config";
import { deleteCalendarOAuthConnection } from "@/lib/calendar-oauth";

type Props = { params: Promise<{ provider: string }> };

export async function DELETE(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  const { provider: raw } = await params;
  if (!CALENDAR_OAUTH_PROVIDERS.includes(raw as CalendarOAuthProvider)) {
    return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 400 });
  }

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte CRM requis." }, { status: 400 });
  }

  try {
    const deleted = await deleteCalendarOAuthConnection(
      session.userId,
      raw as CalendarOAuthProvider,
    );
    if (!deleted) {
      return NextResponse.json({ error: "Connexion introuvable." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/calendar/oauth/disconnect] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
