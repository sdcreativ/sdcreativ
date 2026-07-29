import { NextResponse } from "next/server";
import { formatCalendarDateTime } from "@/content/calendar-labels";
import { getCalendarEventById } from "@/lib/calendar";
import { buildCalendarRsvpUrl } from "@/lib/calendar-rsvp-token";
import { listEventParticipants } from "@/lib/calendar-participants";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { listFiredReminderKeys, markRemindersFired } from "@/lib/crm-reminders";

const WINDOW_MS = 6 * 60 * 60_000; // fenêtre ±6 h autour de J−2 9 h

/**
 * Cron : relance RSVP J−2 aux participants encore « pending ».
 * Auth : Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() + 2);
    target.setHours(9, 0, 0, 0);

    const from = new Date(target.getTime() - WINDOW_MS);
    const to = new Date(target.getTime() + WINDOW_MS);

    // Événements dont starts_at tombe ~ J+2 (fenêtre autour de 9 h locale du jour J+2)
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() + 2);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const eventRows = await withDb(async (query) => {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM calendar_events
         WHERE starts_at >= $1 AND starts_at < $2`,
        [dayStart.toISOString(), dayEnd.toISOString()],
      );
      return rows;
    });

    let reminded = 0;
    let skipped = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "contact@sdcreativ.com";

    const keys: string[] = [];
    const pendingEntries: Array<{
      key: string;
      eventId: string;
      email: string;
      name: string | null;
      title: string;
      startsAt: string;
      allDay: boolean;
    }> = [];

    for (const row of eventRows) {
      const event = await getCalendarEventById(row.id);
      if (!event) continue;
      const participants = await listEventParticipants(event.id);
      for (const p of participants) {
        if (p.status !== "pending") continue;
        const key = `rsvp-j2:${event.id}:${p.email}`;
        keys.push(key);
        pendingEntries.push({
          key,
          eventId: event.id,
          email: p.email,
          name: p.name,
          title: event.title,
          startsAt: event.startsAt,
          allDay: event.allDay,
        });
      }
    }

    const fired = await listFiredReminderKeys(keys);
    const toSend = pendingEntries.filter((e) => !fired.has(e.key));

    // Ne lancer que si on est dans la fenêtre horaire J−2 ~9 h
    const inWindow = now.getTime() >= from.getTime() && now.getTime() <= to.getTime();
    if (!inWindow) {
      return NextResponse.json({
        reminded: 0,
        skipped: toSend.length,
        reason: "Hors fenêtre J−2 9 h (±6 h)",
        pending: toSend.length,
      });
    }

    for (const entry of toSend) {
      const rsvpUrl = buildCalendarRsvpUrl(entry.eventId, entry.email, siteUrl);
      const greeting = entry.name?.split(" ")[0] ?? entry.email.split("@")[0] ?? "Bonjour";
      const when = formatCalendarDateTime(entry.startsAt, entry.allDay);
      const ok = await sendEmail({
        to: entry.email,
        subject: `Rappel — confirmez votre présence : ${entry.title}`,
        html: `<p>Bonjour ${escapeHtml(greeting)},</p>
          <p>Rappel : l’événement <strong>${escapeHtml(entry.title)}</strong> a lieu dans 2 jours (${escapeHtml(when)}).</p>
          <p>Merci de confirmer votre présence :</p>
          <p>
            <a href="${escapeHtml(`${rsvpUrl}?status=accepted`)}" style="margin-right:8px">Accepter</a>
            <a href="${escapeHtml(`${rsvpUrl}?status=tentative`)}" style="margin-right:8px">Peut-être</a>
            <a href="${escapeHtml(`${rsvpUrl}?status=declined`)}">Refuser</a>
          </p>
          <p><a href="${escapeHtml(rsvpUrl)}">Page de réponse</a></p>`,
        replyTo: fromEmail,
      });

      if (ok) {
        reminded += 1;
        await markRemindersFired([
          {
            key: entry.key,
            itemId: entry.eventId,
            itemType: "meeting",
            title: entry.title,
            triggerAt: target.toISOString(),
            channels: ["email"],
          },
        ]);
      } else {
        skipped += 1;
      }
    }

    return NextResponse.json({
      reminded,
      skipped,
      candidates: toSend.length,
      events: eventRows.length,
    });
  } catch (error) {
    console.error("[api/cron/calendar-rsvp-reminders] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
