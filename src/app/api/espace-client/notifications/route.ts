import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  countUnreadPortalNotifications,
  listPortalNotificationHistory,
  listPortalNotificationsSince,
  markAllPortalNotificationsRead,
  markNotificationsRead,
} from "@/lib/billing/notifications";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history") === "1";

    if (history) {
      const [notifications, unreadCount] = await Promise.all([
        listPortalNotificationHistory(session.crmPortalId, 30),
        countUnreadPortalNotifications(session.crmPortalId),
      ]);
      return NextResponse.json({ notifications, unreadCount });
    }

    const since = searchParams.get("since") ?? undefined;
    const notifications = await listPortalNotificationsSince(session.crmPortalId, since);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[api/espace-client/notifications] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    if (body.all === true) {
      await markAllPortalNotificationsRead(session.crmPortalId);
      return NextResponse.json({ success: true });
    }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    await markNotificationsRead(ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/espace-client/notifications] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
