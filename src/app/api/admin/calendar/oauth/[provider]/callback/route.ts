import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import {
  CALENDAR_OAUTH_PROVIDERS,
  type CalendarOAuthProvider,
} from "@/lib/calendar-oauth-config";
import { exchangeOAuthCode, getCalendarOAuthConnection, saveCalendarOAuthConnection } from "@/lib/calendar-oauth";
import { verifyOAuthState } from "@/lib/calendar-oauth-state";
import { pullCalendarOAuthEvents } from "@/lib/calendar-sync";

type Props = { params: Promise<{ provider: string }> };

export async function GET(request: Request, { params }: Props) {
  const { provider: raw } = await params;
  if (!CALENDAR_OAUTH_PROVIDERS.includes(raw as CalendarOAuthProvider)) {
    return NextResponse.redirect(new URL("/admin/crm/calendrier?oauth=invalid", request.url));
  }

  const provider = raw as CalendarOAuthProvider;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const redirectBase = new URL("/admin/crm/calendrier", request.url);

  if (oauthError || !code || !state) {
    redirectBase.searchParams.set("oauth", "error");
    return NextResponse.redirect(redirectBase);
  }

  const payload = verifyOAuthState(state);
  if (!payload || payload.provider !== provider) {
    redirectBase.searchParams.set("oauth", "state");
    return NextResponse.redirect(redirectBase);
  }

  try {
    const tokens = await exchangeOAuthCode(provider, code);
    await saveCalendarOAuthConnection({
      userId: payload.userId,
      provider,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    });

    const connection = await getCalendarOAuthConnection(payload.userId, provider);
    if (connection) {
      await pullCalendarOAuthEvents(connection);
    }

    redirectBase.searchParams.set("oauth", "connected");
    redirectBase.searchParams.set("provider", provider);
    return NextResponse.redirect(redirectBase);
  } catch (error) {
    console.error("[api/admin/calendar/oauth/callback] GET", error);
    redirectBase.searchParams.set("oauth", "error");
    return NextResponse.redirect(redirectBase);
  }
}
