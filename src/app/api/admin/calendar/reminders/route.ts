import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { listCalendarItems } from "@/lib/calendar";
import { buildRemindersForItems } from "@/lib/calendar-reminders";
import { isDatabaseConfigured } from "@/lib/db";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";

const GRACE_MS = 5 * 60_000;

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ reminders: [], upcoming: [] });
  }

  try {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 1);
    const to = new Date(now);
    to.setDate(to.getDate() + 14);

    const items = await listCalendarItems(from, to);
    const due = buildRemindersForItems(items, now, GRACE_MS);
    const fired = await listFiredReminderKeysForChannel(due.map((r) => r.key), "in_app");
    const pending = due.filter((r) => !fired.has(r.key));

    const upcoming = items
      .filter((item) => {
        const start = new Date(item.startsAt).getTime();
        return start > now.getTime() && start <= now.getTime() + 24 * 60 * 60_000;
      })
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        startsAt: item.startsAt,
        linkHref: item.linkHref ?? "/admin/crm/calendrier",
      }));

    return NextResponse.json({ reminders: pending, upcoming });
  } catch (error) {
    console.error("[api/admin/calendar/reminders] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = (await request.json()) as {
      reminders?: Array<{
        key: string;
        itemId: string;
        itemType: string;
        title: string;
        triggerAt: string;
        channels?: string[];
      }>;
    };

    const reminders = body.reminders ?? [];
    await markRemindersFired(reminders);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/calendar/reminders] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
