import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import {
  ensureValidAccessToken,
  getCalendarOAuthConnection,
} from "@/lib/calendar-oauth";

const bodySchema = z.object({
  platform: z.enum(["google_meet", "zoom"]),
  title: z.string().trim().max(200).optional(),
  startsAt: z.string().optional(),
});

/**
 * Génère un lien Meet (via Google Calendar OAuth si connecté) ou oriente vers Zoom.
 */
export async function POST(request: Request) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const { platform, title, startsAt } = parsed.data;

    if (platform === "zoom") {
      return NextResponse.json({
        url: null,
        openUrl: "https://zoom.us/meeting/schedule",
        hint: "Planifiez la réunion Zoom puis collez le lien « Join » ici.",
      });
    }

    const connection = await getCalendarOAuthConnection(session.userId, "google");
    if (!connection) {
      return NextResponse.json({
        url: null,
        openUrl: "https://meet.google.com/new",
        hint: "Connectez Google Agenda (sync) pour générer un lien Meet automatiquement, ou ouvrez Meet et collez le lien.",
      });
    }

    const accessToken = await ensureValidAccessToken(connection);
    const start = startsAt ? new Date(startsAt) : new Date(Date.now() + 60 * 60_000);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Date de début invalide." }, { status: 400 });
    }
    const end = new Date(start.getTime() + 60 * 60_000);
    const calendarId = connection.calendarId || "primary";

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title?.trim() || "Réunion SD CREATIV",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("[api/admin/calendar/meeting-link] Google", text);
      return NextResponse.json({
        url: null,
        openUrl: "https://meet.google.com/new",
        hint: "Impossible de créer le Meet via Google — ouvrez Meet et collez le lien.",
        error: text.slice(0, 200),
      });
    }

    const json = (await res.json()) as {
      hangoutLink?: string;
      conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
    };
    const fromEntries = json.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video" && e.uri,
    )?.uri;
    const url = json.hangoutLink || fromEntries || null;

    if (!url) {
      return NextResponse.json({
        url: null,
        openUrl: "https://meet.google.com/new",
        hint: "Google n’a pas renvoyé de lien Meet — ouvrez Meet et collez le lien.",
      });
    }

    return NextResponse.json({ url, openUrl: null, hint: null });
  } catch (error) {
    console.error("[api/admin/calendar/meeting-link] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
