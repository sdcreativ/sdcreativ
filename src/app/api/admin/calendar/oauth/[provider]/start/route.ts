import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import {
  CALENDAR_OAUTH_PROVIDERS,
  isCalendarOAuthConfigured,
  type CalendarOAuthProvider,
} from "@/lib/calendar-oauth-config";
import { buildOAuthAuthorizeUrl } from "@/lib/calendar-oauth";
import { signOAuthState } from "@/lib/calendar-oauth-state";

type Props = { params: Promise<{ provider: string }> };

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  const { provider: raw } = await params;
  if (!CALENDAR_OAUTH_PROVIDERS.includes(raw as CalendarOAuthProvider)) {
    return NextResponse.json({ error: "Fournisseur inconnu." }, { status: 400 });
  }

  const provider = raw as CalendarOAuthProvider;
  if (!isCalendarOAuthConfigured(provider)) {
    return NextResponse.json(
      { error: `OAuth ${provider} non configuré sur le serveur.` },
      { status: 503 },
    );
  }

  const session = await getAdminSession();
  if (!session?.userId || session.userId === "legacy") {
    return NextResponse.json({ error: "Compte CRM requis pour connecter un calendrier." }, { status: 400 });
  }

  try {
    const state = signOAuthState(session.userId, provider);
    const url = buildOAuthAuthorizeUrl(provider, state);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[api/admin/calendar/oauth/start] GET", error);
    return NextResponse.json({ error: "Impossible de démarrer OAuth." }, { status: 500 });
  }
}
