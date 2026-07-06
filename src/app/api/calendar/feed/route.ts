import { NextResponse } from "next/server";
import { listCalendarItems } from "@/lib/calendar";
import { buildCalendarIcalFeed } from "@/lib/calendar-ical";
import { isDatabaseConfigured } from "@/lib/db";

function getFeedToken(): string | undefined {
  return process.env.ICAL_FEED_TOKEN ?? process.env.CRON_SECRET;
}

/** Feed iCal en lecture seule — token via query ou Authorization Bearer */
export async function GET(request: Request) {
  const expected = getFeedToken();
  if (!expected) {
    return NextResponse.json({ error: "Feed non configuré (ICAL_FEED_TOKEN)." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const queryToken = searchParams.get("token");
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (queryToken !== expected && bearer !== expected) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(now);
    to.setMonth(to.getMonth() + 6);

    const items = await listCalendarItems(from, to);
    const ical = buildCalendarIcalFeed(items);

    return new NextResponse(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sdcreativ-crm.ics"',
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[api/calendar/feed] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
