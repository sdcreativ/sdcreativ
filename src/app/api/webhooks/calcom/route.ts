import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createCalendarEvent } from "@/lib/calendar";

/** Webhook Cal.com — crée un événement CRM (lecture seule côté Cal.com, sync entrante). */
export async function POST(request: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      startTime?: string;
      endTime?: string;
      description?: string;
      attendees?: Array<{ email?: string; name?: string }>;
    };

    if (!body.title || !body.startTime) {
      return NextResponse.json({ error: "title et startTime requis." }, { status: 400 });
    }

    const event = await createCalendarEvent({
      title: `[Cal.com] ${body.title}`,
      description: body.description ?? null,
      type: "meeting",
      startsAt: body.startTime,
      endsAt: body.endTime ?? null,
      allDay: false,
      assignee: null,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[api/webhooks/calcom] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
