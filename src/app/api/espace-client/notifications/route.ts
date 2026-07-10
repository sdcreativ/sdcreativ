import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  listPortalNotificationsSince,
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
    const since = searchParams.get("since") ?? undefined;
    const notifications = await listPortalNotificationsSince(session.clientId, since);
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
    const body = (await request.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids : [];
    await markNotificationsRead(ids);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/espace-client/notifications] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
