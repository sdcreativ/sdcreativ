import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import {
  generateGoogleMeetLink,
  generateTeamsMeetingLink,
  generateZoomMeetingLink,
} from "@/lib/calendar-meet";

const bodySchema = z.object({
  platform: z.enum(["google_meet", "teams", "zoom"]),
  title: z.string().trim().max(200).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

/**
 * Génère un lien Meet / Teams / Zoom (comptes agence ou OAuth collab).
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

    const { platform, title, startsAt, endsAt } = parsed.data;

    const result =
      platform === "zoom"
        ? await generateZoomMeetingLink({ title, startsAt, endsAt })
        : platform === "teams"
          ? await generateTeamsMeetingLink({
              userId: session.userId,
              title,
              startsAt,
              endsAt,
            })
          : await generateGoogleMeetLink({
              userId: session.userId,
              title,
              startsAt,
              endsAt,
            });

    if (result.ok) {
      return NextResponse.json({
        url: result.url,
        openUrl: null,
        hint: null,
        source: result.source,
        needsGoogleConnect: false,
        needsMicrosoftConnect: false,
        needsZoomConfig: false,
      });
    }

    return NextResponse.json({
      url: null,
      openUrl: result.openUrl,
      hint: result.error,
      error: result.error,
      needsGoogleConnect: result.needsGoogleConnect,
      needsMicrosoftConnect: result.needsMicrosoftConnect ?? false,
      needsZoomConfig: result.needsZoomConfig ?? false,
    });
  } catch (error) {
    console.error("[api/admin/calendar/meeting-link] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
