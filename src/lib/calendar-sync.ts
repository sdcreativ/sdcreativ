import type { CalendarEvent } from "@/lib/calendar";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";
import {
  ensureValidAccessToken,
  getCalendarOAuthConnection,
  listAllCalendarOAuthConnections,
  updateCalendarOAuthSyncState,
  type CalendarOAuthConnection,
} from "@/lib/calendar-oauth";
import { withDb } from "@/lib/db";

type OAuthSyncMeta = {
  google?: { eventId: string; updatedAt?: string };
  microsoft?: { eventId: string; updatedAt?: string };
  source?: CalendarOAuthProvider | "crm";
  imported?: boolean;
};

type ExternalEvent = {
  externalId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  updatedAt: string | null;
};

function providerKey(provider: CalendarOAuthProvider): "google" | "microsoft" {
  return provider;
}

function parseMetadata(raw: Record<string, unknown> | null): OAuthSyncMeta {
  const oauthSync = raw?.oauthSync;
  if (!oauthSync || typeof oauthSync !== "object") return {};
  return oauthSync as OAuthSyncMeta;
}

async function findEventIdByExternalId(
  provider: CalendarOAuthProvider,
  externalId: string,
): Promise<string | null> {
  return withDb(async (query) => {
    const key = providerKey(provider);
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM calendar_events
       WHERE metadata->'oauthSync'->$1->>'eventId' = $2
       LIMIT 1`,
      [key, externalId],
    );
    return rows[0]?.id ?? null;
  });
}

async function patchEventOAuthMetadata(
  eventId: string,
  patch: Partial<OAuthSyncMeta> & {
    google?: { eventId: string; updatedAt?: string };
    microsoft?: { eventId: string; updatedAt?: string };
  },
): Promise<void> {
  await withDb(async (query) => {
    const { rows } = await query<{ metadata: Record<string, unknown> | null }>(
      `SELECT metadata FROM calendar_events WHERE id = $1`,
      [eventId],
    );
    const existing = rows[0]?.metadata ?? {};
    const current = parseMetadata(existing);
    const oauthSync: OAuthSyncMeta = { ...current, ...patch };
    if (patch.google) oauthSync.google = { ...current.google, ...patch.google };
    if (patch.microsoft) oauthSync.microsoft = { ...current.microsoft, ...patch.microsoft };

    await query(
      `UPDATE calendar_events SET metadata = $2, updated_at = NOW() WHERE id = $1`,
      [eventId, JSON.stringify({ ...existing, oauthSync })],
    );
  });
}

function toGoogleBody(event: CalendarEvent) {
  const start = event.allDay
    ? { date: event.startsAt.slice(0, 10) }
    : { dateTime: event.startsAt, timeZone: "UTC" };
  const end = event.endsAt
    ? event.allDay
      ? { date: event.endsAt.slice(0, 10) }
      : { dateTime: event.endsAt, timeZone: "UTC" }
    : event.allDay
      ? { date: event.startsAt.slice(0, 10) }
      : { dateTime: new Date(new Date(event.startsAt).getTime() + 3600_000).toISOString(), timeZone: "UTC" };

  return {
    summary: event.title,
    description: event.description ?? undefined,
    start,
    end,
  };
}

function toMicrosoftBody(event: CalendarEvent) {
  return {
    subject: event.title,
    body: event.description ? { contentType: "Text", content: event.description } : undefined,
    start: event.allDay
      ? { dateTime: `${event.startsAt.slice(0, 10)}T00:00:00`, timeZone: "UTC" }
      : { dateTime: event.startsAt, timeZone: "UTC" },
    end: event.endsAt
      ? event.allDay
        ? { dateTime: `${event.endsAt.slice(0, 10)}T00:00:00`, timeZone: "UTC" }
        : { dateTime: event.endsAt, timeZone: "UTC" }
      : event.allDay
        ? { dateTime: `${event.startsAt.slice(0, 10)}T23:59:59`, timeZone: "UTC" }
        : {
            dateTime: new Date(new Date(event.startsAt).getTime() + 3600_000).toISOString(),
            timeZone: "UTC",
          },
    isAllDay: event.allDay,
  };
}

async function fetchGoogleEvents(
  accessToken: string,
  calendarId: string,
  syncToken: string | null,
): Promise<{ events: ExternalEvent[]; nextSyncToken: string | null }> {
  const params = new URLSearchParams({ singleEvents: "true" });
  if (syncToken) {
    params.set("syncToken", syncToken);
  } else {
    const now = new Date();
    const min = new Date(now);
    min.setDate(min.getDate() - 30);
    const max = new Date(now);
    max.setDate(max.getDate() + 90);
    params.set("timeMin", min.toISOString());
    params.set("timeMax", max.toISOString());
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (res.status === 410) {
    return fetchGoogleEvents(accessToken, calendarId, null);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar list: ${text}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      status?: string;
      summary?: string;
      description?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      updated?: string;
    }>;
    nextSyncToken?: string;
  };

  const events: ExternalEvent[] = (json.items ?? [])
    .filter((item) => item.status !== "cancelled" && item.id)
    .map((item) => {
      const allDay = Boolean(item.start?.date);
      const startsAt = item.start?.dateTime ?? `${item.start?.date}T12:00:00.000Z`;
      const endsAt = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T12:00:00.000Z` : null);
      return {
        externalId: item.id,
        title: item.summary ?? "Sans titre",
        description: item.description ?? null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        allDay,
        updatedAt: item.updated ?? null,
      };
    });

  return { events, nextSyncToken: json.nextSyncToken ?? syncToken };
}

async function fetchMicrosoftEvents(accessToken: string): Promise<ExternalEvent[]> {
  const now = new Date();
  const min = new Date(now);
  min.setDate(min.getDate() - 30);
  const max = new Date(now);
  max.setDate(max.getDate() + 90);

  const params = new URLSearchParams({
    startDateTime: min.toISOString(),
    endDateTime: max.toISOString(),
    $top: "250",
    $orderby: "start/dateTime",
  });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendar/calendarView?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph list: ${text}`);
  }

  const json = (await res.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      start?: { dateTime: string; timeZone: string };
      end?: { dateTime: string; timeZone: string };
      isAllDay?: boolean;
      lastModifiedDateTime?: string;
    }>;
  };

  return (json.value ?? []).map((item) => ({
    externalId: item.id,
    title: item.subject ?? "Sans titre",
    description: item.bodyPreview ?? null,
    startsAt: new Date(item.start?.dateTime ?? now.toISOString()).toISOString(),
    endsAt: item.end?.dateTime ? new Date(item.end.dateTime).toISOString() : null,
    allDay: item.isAllDay ?? false,
    updatedAt: item.lastModifiedDateTime ?? null,
  }));
}

async function upsertExternalEvent(
  provider: CalendarOAuthProvider,
  external: ExternalEvent,
): Promise<"created" | "updated" | "skipped"> {
  const existingId = await findEventIdByExternalId(provider, external.externalId);
  const key = providerKey(provider);

  if (existingId) {
    await withDb(async (query) => {
      await query(
        `UPDATE calendar_events SET
          title = $2,
          description = $3,
          starts_at = $4,
          ends_at = $5,
          all_day = $6,
          updated_at = NOW()
        WHERE id = $1`,
        [
          existingId,
          external.title,
          external.description,
          external.startsAt,
          external.endsAt,
          external.allDay,
        ],
      );
    });
    return "updated";
  }

  await withDb(async (query) => {
    const metadata = {
      oauthSync: {
        source: provider,
        imported: true,
        [key]: { eventId: external.externalId, updatedAt: external.updatedAt },
      },
    };
    await query(
      `INSERT INTO calendar_events (
        title, description, type, starts_at, ends_at, all_day, metadata
      ) VALUES ($1,$2,'meeting',$3,$4,$5,$6)`,
      [
        external.title.startsWith("[") ? external.title : `[${provider === "google" ? "Google" : "Outlook"}] ${external.title}`,
        external.description,
        external.startsAt,
        external.endsAt,
        external.allDay,
        JSON.stringify(metadata),
      ],
    );
  });
  return "created";
}

export async function pullCalendarOAuthEvents(
  connection: CalendarOAuthConnection & { accessToken: string; refreshToken: string | null },
): Promise<{ created: number; updated: number }> {
  const accessToken = await ensureValidAccessToken(connection);
  let created = 0;
  let updated = 0;

  if (connection.provider === "google") {
    const { events, nextSyncToken } = await fetchGoogleEvents(
      accessToken,
      connection.calendarId,
      connection.syncToken,
    );
    for (const event of events) {
      const result = await upsertExternalEvent("google", event);
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
    }
    await updateCalendarOAuthSyncState(connection.id, nextSyncToken);
  } else {
    const events = await fetchMicrosoftEvents(accessToken);
    for (const event of events) {
      const result = await upsertExternalEvent("microsoft", event);
      if (result === "created") created += 1;
      if (result === "updated") updated += 1;
    }
    await updateCalendarOAuthSyncState(connection.id, null);
  }

  return { created, updated };
}

async function getEventWithMetadata(eventId: string): Promise<
  (CalendarEvent & { metadata: OAuthSyncMeta }) | null
> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      starts_at: Date;
      ends_at: Date | null;
      all_day: boolean;
      assignee: string | null;
      client_id: string | null;
      project_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM calendar_events WHERE id = $1`, [eventId]);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as CalendarEvent["type"],
      startsAt: row.starts_at.toISOString(),
      endsAt: row.ends_at?.toISOString() ?? null,
      allDay: row.all_day,
      assignee: row.assignee,
      clientId: row.client_id,
      projectId: row.project_id,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      metadata: parseMetadata(row.metadata),
    };
  });
}

async function pushToGoogle(
  accessToken: string,
  calendarId: string,
  event: CalendarEvent,
  externalId: string | undefined,
): Promise<string> {
  const body = toGoogleBody(event);
  const url = externalId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(externalId)}`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  const res = await fetch(url, {
    method: externalId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google push: ${text}`);
  }

  const json = (await res.json()) as { id: string; updated?: string };
  return json.id;
}

async function pushToMicrosoft(
  accessToken: string,
  event: CalendarEvent,
  externalId: string | undefined,
): Promise<string> {
  const body = toMicrosoftBody(event);
  const url = externalId
    ? `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(externalId)}`
    : "https://graph.microsoft.com/v1.0/me/events";

  const res = await fetch(url, {
    method: externalId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft push: ${text}`);
  }

  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function pushCalendarEventToOAuthProviders(
  userId: string,
  eventId: string,
): Promise<void> {
  const event = await getEventWithMetadata(eventId);
  if (!event || event.metadata.imported) return;

  for (const provider of ["google", "microsoft"] as const) {
    const connection = await getCalendarOAuthConnection(userId, provider);
    if (!connection) continue;

    const accessToken = await ensureValidAccessToken(connection);
    const existingExternalId = event.metadata[provider]?.eventId;

    try {
      const externalId =
        provider === "google"
          ? await pushToGoogle(accessToken, connection.calendarId, event, existingExternalId)
          : await pushToMicrosoft(accessToken, event, existingExternalId);

      await patchEventOAuthMetadata(
        eventId,
        provider === "google"
          ? { source: "crm", google: { eventId: externalId, updatedAt: new Date().toISOString() } }
          : { source: "crm", microsoft: { eventId: externalId, updatedAt: new Date().toISOString() } },
      );
    } catch (error) {
      console.error(`[calendar-sync] push ${provider}`, error);
    }
  }
}

export async function deleteCalendarEventFromOAuthProviders(
  userId: string,
  eventId: string,
): Promise<void> {
  const event = await getEventWithMetadata(eventId);
  if (!event) return;

  for (const provider of ["google", "microsoft"] as const) {
    const externalId = event.metadata[provider]?.eventId;
    if (!externalId) continue;

    const connection = await getCalendarOAuthConnection(userId, provider);
    if (!connection) continue;

    const accessToken = await ensureValidAccessToken(connection);

    try {
      const url =
        provider === "google"
          ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(externalId)}`
          : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(externalId)}`;

      await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.error(`[calendar-sync] delete ${provider}`, error);
    }
  }
}

export async function syncCalendarOAuthForUser(
  userId: string,
  provider?: CalendarOAuthProvider,
): Promise<{ created: number; updated: number }> {
  const connections = await listAllCalendarOAuthConnections();
  const mine = connections.filter((c) => c.userId === userId && (!provider || c.provider === provider));

  let created = 0;
  let updated = 0;
  for (const connection of mine) {
    const result = await pullCalendarOAuthEvents(connection);
    created += result.created;
    updated += result.updated;
  }
  return { created, updated };
}

export async function syncAllCalendarOAuthConnections(): Promise<{
  connections: number;
  created: number;
  updated: number;
}> {
  const connections = await listAllCalendarOAuthConnections();
  let created = 0;
  let updated = 0;

  for (const connection of connections) {
    try {
      const result = await pullCalendarOAuthEvents(connection);
      created += result.created;
      updated += result.updated;
    } catch (error) {
      console.error(`[calendar-sync] pull ${connection.provider}/${connection.userId}`, error);
    }
  }

  return { connections: connections.length, created, updated };
}
