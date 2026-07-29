import { randomUUID } from "node:crypto";
import {
  ensureValidAccessToken,
  getCalendarOAuthConnection,
  listAllCalendarOAuthConnections,
  type CalendarOAuthConnection,
} from "@/lib/calendar-oauth";
import {
  isGoogleOAuthConfigured,
  isMicrosoftOAuthConfigured,
  type CalendarOAuthProvider,
} from "@/lib/calendar-oauth-config";
import { getCalendarAgencySettings } from "@/lib/calendar-agency-settings";

export type MeetingLinkSource =
  | "google"
  | "microsoft"
  | "zoom"
  | "agency_google"
  | "agency_microsoft"
  | "agency_zoom";

export type MeetGenerationResult =
  | { ok: true; url: string; source: MeetingLinkSource }
  | {
      ok: false;
      error: string;
      openUrl: string | null;
      needsGoogleConnect: boolean;
      needsMicrosoftConnect?: boolean;
      needsZoomConfig?: boolean;
    };

type GoogleEventPayload = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
};

export function extractMeetUrl(json: GoogleEventPayload): string | null {
  if (typeof json.hangoutLink === "string" && json.hangoutLink.trim()) {
    return json.hangoutLink.trim();
  }
  const video = json.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === "video" && e.uri,
  )?.uri;
  return video?.trim() || null;
}

type OAuthConn = CalendarOAuthConnection & {
  accessToken: string;
  refreshToken: string | null;
};

async function resolveProviderConnections(
  provider: CalendarOAuthProvider,
  preferredUserId?: string | null,
  agencyUserId?: string | null,
): Promise<Array<OAuthConn & { isAgency: boolean }>> {
  const ordered: Array<OAuthConn & { isAgency: boolean }> = [];

  async function pushUser(userId: string | null | undefined, isAgency: boolean) {
    if (!userId || userId === "legacy") return;
    if (ordered.some((c) => c.userId === userId && c.provider === provider)) return;
    const conn = await getCalendarOAuthConnection(userId, provider);
    if (conn) ordered.push({ ...conn, isAgency });
  }

  // 1) Compte agence partagé (prioritaire)
  await pushUser(agencyUserId, true);
  // 2) Compte de l’utilisateur courant
  await pushUser(preferredUserId, false);

  const all = await listAllCalendarOAuthConnections();
  for (const conn of all) {
    if (conn.provider !== provider) continue;
    if (ordered.some((c) => c.id === conn.id)) continue;
    ordered.push({ ...conn, isAgency: agencyUserId === conn.userId });
  }

  return ordered;
}

async function createMeetWithToken(
  accessToken: string,
  calendarId: string,
  input: { title: string; startsAt: Date; endsAt: Date },
): Promise<string | null> {
  const createRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: input.startsAt.toISOString() },
        end: { dateTime: input.endsAt.toISOString() },
        conferenceData: {
          createRequest: {
            requestId: randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  if (!createRes.ok) {
    const text = await createRes.text();
    console.error("[calendar-meet] create failed", createRes.status, text.slice(0, 300));
    return null;
  }

  const created = (await createRes.json()) as GoogleEventPayload;
  let url = extractMeetUrl(created);
  if (url) return url;

  if (created.id) {
    await new Promise((r) => setTimeout(r, 800));
    const getRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(created.id)}?conferenceDataVersion=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (getRes.ok) {
      url = extractMeetUrl((await getRes.json()) as GoogleEventPayload);
      if (url) return url;
    }

    const patchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(created.id)}?conferenceDataVersion=1`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      },
    );
    if (patchRes.ok) {
      url = extractMeetUrl((await patchRes.json()) as GoogleEventPayload);
    }
  }

  return url;
}

async function createTeamsWithToken(
  accessToken: string,
  input: { title: string; startsAt: Date; endsAt: Date },
): Promise<string | null> {
  const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: input.title,
      start: { dateTime: input.startsAt.toISOString(), timeZone: "UTC" },
      end: { dateTime: input.endsAt.toISOString(), timeZone: "UTC" },
      isOnlineMeeting: true,
      onlineMeetingProvider: "teamsForBusiness",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[calendar-meet] Teams create failed", res.status, text.slice(0, 300));
    return null;
  }

  const json = (await res.json()) as {
    onlineMeeting?: { joinUrl?: string };
    onlineMeetingUrl?: string;
  };
  const url = json.onlineMeeting?.joinUrl || json.onlineMeetingUrl || null;
  return url?.trim() || null;
}

function parseWindow(input: {
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}): { start: Date; end: Date } | { error: string } {
  const start =
    input.startsAt instanceof Date
      ? input.startsAt
      : input.startsAt
        ? new Date(input.startsAt)
        : new Date(Date.now() + 60 * 60_000);
  if (Number.isNaN(start.getTime())) return { error: "Date de début invalide." };
  const end =
    input.endsAt instanceof Date
      ? input.endsAt
      : input.endsAt
        ? new Date(input.endsAt)
        : new Date(start.getTime() + 60 * 60_000);
  return { start, end };
}

/**
 * Crée un Google Meet via Calendar API.
 * Ordre : compte agence → user courant → autres connexions Google.
 */
export async function generateGoogleMeetLink(input: {
  userId?: string | null;
  title?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}): Promise<MeetGenerationResult> {
  if (!isGoogleOAuthConfigured()) {
    return {
      ok: false,
      error: "Google OAuth non configuré sur le serveur (GOOGLE_CLIENT_ID / SECRET).",
      openUrl: null,
      needsGoogleConnect: false,
    };
  }

  const agency = await getCalendarAgencySettings();
  const connections = await resolveProviderConnections(
    "google",
    input.userId,
    agency.meetAgencyUserId,
  );
  if (connections.length === 0) {
    return {
      ok: false,
      error:
        "Connectez Google Agenda (compte agence ou personnel) pour générer un lien Meet automatiquement.",
      openUrl: null,
      needsGoogleConnect: true,
    };
  }

  const window = parseWindow(input);
  if ("error" in window) {
    return {
      ok: false,
      error: window.error,
      openUrl: null,
      needsGoogleConnect: false,
    };
  }

  const title = input.title?.trim() || "Réunion SD CREATIV";

  for (const conn of connections) {
    try {
      const accessToken = await ensureValidAccessToken(conn);
      const url = await createMeetWithToken(accessToken, conn.calendarId || "primary", {
        title,
        startsAt: window.start,
        endsAt: window.end,
      });
      if (url) {
        return {
          ok: true,
          url,
          source: conn.isAgency ? "agency_google" : "google",
        };
      }
    } catch (error) {
      console.error("[calendar-meet] Google connection failed", conn.userId, error);
    }
  }

  return {
    ok: false,
    error:
      "Impossible de créer le Meet via Google Agenda. Vérifiez le compte agence ou votre connexion OAuth.",
    openUrl: null,
    needsGoogleConnect: false,
  };
}

/**
 * Crée une réunion Teams via Microsoft Graph (événement calendrier online).
 * Ordre : compte agence → user courant → autres connexions Microsoft.
 */
export async function generateTeamsMeetingLink(input: {
  userId?: string | null;
  title?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}): Promise<MeetGenerationResult> {
  if (!isMicrosoftOAuthConfigured()) {
    return {
      ok: false,
      error: "Microsoft OAuth non configuré (MICROSOFT_CLIENT_ID / SECRET).",
      openUrl: null,
      needsGoogleConnect: false,
      needsMicrosoftConnect: false,
    };
  }

  const agency = await getCalendarAgencySettings();
  const connections = await resolveProviderConnections(
    "microsoft",
    input.userId,
    agency.teamsAgencyUserId,
  );
  if (connections.length === 0) {
    return {
      ok: false,
      error:
        "Connectez Outlook / Microsoft 365 (compte agence ou personnel) pour générer un lien Teams.",
      openUrl: "https://teams.microsoft.com/",
      needsGoogleConnect: false,
      needsMicrosoftConnect: true,
    };
  }

  const window = parseWindow(input);
  if ("error" in window) {
    return {
      ok: false,
      error: window.error,
      openUrl: null,
      needsGoogleConnect: false,
    };
  }

  const title = input.title?.trim() || "Réunion SD CREATIV";

  for (const conn of connections) {
    try {
      const accessToken = await ensureValidAccessToken(conn);
      const url = await createTeamsWithToken(accessToken, {
        title,
        startsAt: window.start,
        endsAt: window.end,
      });
      if (url) {
        return {
          ok: true,
          url,
          source: conn.isAgency ? "agency_microsoft" : "microsoft",
        };
      }
    } catch (error) {
      console.error("[calendar-meet] Teams connection failed", conn.userId, error);
    }
  }

  return {
    ok: false,
    error:
      "Impossible de créer la réunion Teams. Vérifiez le compte agence Microsoft ou réessayez.",
    openUrl: "https://teams.microsoft.com/",
    needsGoogleConnect: false,
    needsMicrosoftConnect: false,
  };
}

/**
 * Crée une réunion Zoom via API Server-to-Server (compte agence).
 */
export async function generateZoomMeetingLink(input: {
  title?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}): Promise<MeetGenerationResult> {
  const { isZoomApiConfigured } = await import("@/lib/zoom-config");
  if (!isZoomApiConfigured()) {
    return {
      ok: false,
      error:
        "Zoom agence non configuré. Ajoutez ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET (et ZOOM_HOST_EMAIL) dans .env.docker.",
      openUrl: "https://zoom.us/meeting/schedule",
      needsGoogleConnect: false,
      needsZoomConfig: true,
    };
  }

  const window = parseWindow(input);
  if ("error" in window) {
    return {
      ok: false,
      error: window.error,
      openUrl: null,
      needsGoogleConnect: false,
    };
  }

  try {
    const { createZoomMeeting } = await import("@/lib/zoom-meetings");
    const created = await createZoomMeeting({
      title: input.title?.trim() || "Réunion SD CREATIV",
      startsAt: window.start,
      endsAt: window.end,
    });
    if (created?.joinUrl) {
      return { ok: true, url: created.joinUrl, source: "agency_zoom" };
    }
  } catch (error) {
    console.error("[calendar-meet] Zoom failed", error);
  }

  return {
    ok: false,
    error: "Impossible de créer la réunion Zoom. Vérifiez les credentials Zoom agence.",
    openUrl: "https://zoom.us/meeting/schedule",
    needsGoogleConnect: false,
    needsZoomConfig: false,
  };
}

/** Si plateforme Meet/Teams/Zoom et pas d’URL, génère et retourne l’URL (sinon null). */
export async function maybeAutoGenerateMeetUrl(input: {
  userId?: string | null;
  meetingPlatform?: string | null;
  meetingUrl?: string | null;
  title?: string | null;
  startsAt?: string | null;
}): Promise<string | null> {
  if (input.meetingUrl?.trim()) return null;
  if (input.meetingPlatform === "google_meet") {
    const result = await generateGoogleMeetLink({
      userId: input.userId,
      title: input.title,
      startsAt: input.startsAt,
    });
    return result.ok ? result.url : null;
  }
  if (input.meetingPlatform === "teams") {
    const result = await generateTeamsMeetingLink({
      userId: input.userId,
      title: input.title,
      startsAt: input.startsAt,
    });
    return result.ok ? result.url : null;
  }
  if (input.meetingPlatform === "zoom") {
    const result = await generateZoomMeetingLink({
      title: input.title,
      startsAt: input.startsAt,
    });
    return result.ok ? result.url : null;
  }
  return null;
}
