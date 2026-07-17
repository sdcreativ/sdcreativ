import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import {
  isGoogleOAuthConfigured,
  isMicrosoftOAuthConfigured,
} from "@/lib/calendar-oauth-config";
import { listCalendarOAuthConnections } from "@/lib/calendar-oauth";
import { isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({
        connections: [],
        providers: {
          google: { configured: isGoogleOAuthConfigured(), connected: false },
          microsoft: { configured: isMicrosoftOAuthConfigured(), connected: false },
        },
        requiresCrmAccount: true,
      });
    }

    const connections = await listCalendarOAuthConnections(session.userId);
    const connected = new Set(connections.map((c) => c.provider));

    return NextResponse.json({
      connections,
      providers: {
        google: { configured: isGoogleOAuthConfigured(), connected: connected.has("google") },
        microsoft: { configured: isMicrosoftOAuthConfigured(), connected: connected.has("microsoft") },
      },
      requiresCrmAccount: false,
    });
  } catch (error) {
    console.error("[api/admin/calendar/oauth/status] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
