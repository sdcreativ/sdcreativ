import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  getCalendarAgencySettings,
  updateCalendarAgencySettings,
  updateCalendarAgencySettingsSchema,
} from "@/lib/calendar-agency-settings";
import { listAllCalendarOAuthConnections } from "@/lib/calendar-oauth";
import { isZoomApiConfigured } from "@/lib/zoom-config";

export async function GET() {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const [settings, connections] = await Promise.all([
      getCalendarAgencySettings(),
      listAllCalendarOAuthConnections(),
    ]);

    const userIds = [...new Set(connections.map((c) => c.userId))];
    const users =
      userIds.length === 0
        ? []
        : await withDb(async (query) => {
            const { rows } = await query<{ id: string; name: string; email: string }>(
              `SELECT id, name, email FROM crm_users WHERE id = ANY($1::uuid[])`,
              [userIds],
            );
            return rows;
          });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      settings,
      zoomConfigured: isZoomApiConfigured(),
      zoomHost: process.env.ZOOM_HOST_EMAIL?.trim() || process.env.ZOOM_USER_ID?.trim() || null,
      googleAccounts: connections
        .filter((c) => c.provider === "google")
        .map((c) => ({
          userId: c.userId,
          accountEmail: c.accountEmail,
          userName: userMap.get(c.userId)?.name ?? null,
          userEmail: userMap.get(c.userId)?.email ?? null,
          isAgency: settings.meetAgencyUserId === c.userId,
        })),
      microsoftAccounts: connections
        .filter((c) => c.provider === "microsoft")
        .map((c) => ({
          userId: c.userId,
          accountEmail: c.accountEmail,
          userName: userMap.get(c.userId)?.name ?? null,
          userEmail: userMap.get(c.userId)?.email ?? null,
          isAgency: settings.teamsAgencyUserId === c.userId,
        })),
    });
  } catch (error) {
    console.error("[api/admin/calendar/agency-settings] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = updateCalendarAgencySettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    const settings = await updateCalendarAgencySettings(parsed.data);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[api/admin/calendar/agency-settings] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
