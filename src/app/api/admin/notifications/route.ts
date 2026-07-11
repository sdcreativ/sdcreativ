import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  countUnreadAdminNotifications,
  listAdminNotificationHistory,
  listAdminNotificationsSince,
  markAllAdminNotificationsRead,
  markNotificationsRead,
} from "@/lib/billing/notifications";

export async function GET(request: Request) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history") === "1";

    if (history) {
      const [notifications, unreadCount] = await Promise.all([
        listAdminNotificationHistory(30),
        countUnreadAdminNotifications(),
      ]);
      return NextResponse.json({ notifications, unreadCount });
    }

    const since = searchParams.get("since") ?? undefined;
    const notifications = await listAdminNotificationsSince(since);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("[api/admin/notifications] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    if (body.all === true) {
      await markAllAdminNotificationsRead();
      return NextResponse.json({ success: true });
    }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    await markNotificationsRead(ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/notifications] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
