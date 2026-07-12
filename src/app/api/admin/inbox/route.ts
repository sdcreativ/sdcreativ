import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listInboxItems, markAllInboxRead, markInboxItemRead } from "@/lib/inbox";

export async function GET(request: Request) {
  const authError = await crmApiAuth.tickets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const items = await listInboxItems(session.userId, {
      type: (searchParams.get("type") as never) ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") === "1",
    });
    const unreadCount = items.filter((i) => !i.read).length;
    return NextResponse.json({ items, unreadCount });
  } catch (error) {
    console.error("[api/admin/inbox] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.tickets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  const session = await getAdminSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (body.action === "mark_all_read" && Array.isArray(body.keys)) {
      await markAllInboxRead(session.userId, body.keys as string[]);
      return NextResponse.json({ ok: true });
    }
    if (typeof body.itemKey === "string") {
      await markInboxItemRead(session.userId, body.itemKey);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  } catch (error) {
    console.error("[api/admin/inbox] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
