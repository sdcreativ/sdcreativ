import { withDb } from "@/lib/db";
import type { CalendarOAuthProvider } from "@/lib/calendar-oauth-config";
import {
  getGoogleOAuthScopes,
  getMicrosoftOAuthScopes,
  getOAuthRedirectUri,
} from "@/lib/calendar-oauth-config";

export type CalendarOAuthConnection = {
  id: string;
  userId: string;
  provider: CalendarOAuthProvider;
  calendarId: string;
  expiresAt: string | null;
  syncToken: string | null;
  lastSyncAt: string | null;
  accountEmail: string | null;
  createdAt: string;
};

type ConnectionRow = {
  id: string;
  user_id: string;
  provider: CalendarOAuthProvider;
  access_token: string;
  refresh_token: string | null;
  expires_at: Date | null;
  calendar_id: string;
  sync_token: string | null;
  metadata: Record<string, unknown> | null;
  last_sync_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapConnection(row: ConnectionRow): CalendarOAuthConnection {
  const metadata = row.metadata ?? {};
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    calendarId: row.calendar_id,
    expiresAt: row.expires_at?.toISOString() ?? null,
    syncToken: row.sync_token,
    lastSyncAt: row.last_sync_at?.toISOString() ?? null,
    accountEmail: typeof metadata.accountEmail === "string" ? metadata.accountEmail : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function listCalendarOAuthConnections(
  userId: string,
): Promise<CalendarOAuthConnection[]> {
  return withDb(async (query) => {
    const { rows } = await query<ConnectionRow>(
      `SELECT * FROM calendar_oauth_connections WHERE user_id = $1 ORDER BY provider`,
      [userId],
    );
    return rows.map(mapConnection);
  });
}

export async function getCalendarOAuthConnection(
  userId: string,
  provider: CalendarOAuthProvider,
): Promise<(CalendarOAuthConnection & { accessToken: string; refreshToken: string | null }) | null> {
  return withDb(async (query) => {
    const { rows } = await query<ConnectionRow>(
      `SELECT * FROM calendar_oauth_connections WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...mapConnection(row),
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
    };
  });
}

export async function deleteCalendarOAuthConnection(
  userId: string,
  provider: CalendarOAuthProvider,
): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `DELETE FROM calendar_oauth_connections WHERE user_id = $1 AND provider = $2`,
      [userId, provider],
    );
    return (rowCount ?? 0) > 0;
  });
}

export async function listAllCalendarOAuthConnections(): Promise<
  Array<CalendarOAuthConnection & { accessToken: string; refreshToken: string | null }>
> {
  return withDb(async (query) => {
    const { rows } = await query<ConnectionRow>(
      `SELECT * FROM calendar_oauth_connections ORDER BY updated_at ASC`,
    );
    return rows.map((row) => ({
      ...mapConnection(row),
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
    }));
  });
}

async function exchangeToken(
  provider: CalendarOAuthProvider,
  params: Record<string, string>,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}> {
  const url =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token (${provider}): ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

export function buildOAuthAuthorizeUrl(
  provider: CalendarOAuthProvider,
  state: string,
): string {
  const redirectUri = getOAuthRedirectUri(provider);

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: getGoogleOAuthScopes(),
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: getMicrosoftOAuthScopes(),
    response_mode: "query",
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeOAuthCode(
  provider: CalendarOAuthProvider,
  code: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  const redirectUri = getOAuthRedirectUri(provider);
  const clientId =
    provider === "google" ? process.env.GOOGLE_CLIENT_ID! : process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_SECRET!
      : process.env.MICROSOFT_CLIENT_SECRET!;

  const json = await exchangeToken(provider, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

export async function refreshOAuthAccessToken(
  provider: CalendarOAuthProvider,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date | null }> {
  const clientId =
    provider === "google" ? process.env.GOOGLE_CLIENT_ID! : process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret =
    provider === "google"
      ? process.env.GOOGLE_CLIENT_SECRET!
      : process.env.MICROSOFT_CLIENT_SECRET!;

  const json = await exchangeToken(provider, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

async function fetchAccountEmail(
  provider: CalendarOAuthProvider,
  accessToken: string,
): Promise<string | null> {
  try {
    if (provider === "google") {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { email?: string };
      return json.email ?? null;
    }

    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { mail?: string; userPrincipalName?: string };
    return json.mail ?? json.userPrincipalName ?? null;
  } catch {
    return null;
  }
}

export async function saveCalendarOAuthConnection(input: {
  userId: string;
  provider: CalendarOAuthProvider;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  calendarId?: string;
}): Promise<CalendarOAuthConnection> {
  const accountEmail = await fetchAccountEmail(input.provider, input.accessToken);

  return withDb(async (query) => {
    const { rows } = await query<ConnectionRow>(
      `INSERT INTO calendar_oauth_connections (
        user_id, provider, access_token, refresh_token, expires_at, calendar_id, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, calendar_oauth_connections.refresh_token),
        expires_at = EXCLUDED.expires_at,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *`,
      [
        input.userId,
        input.provider,
        input.accessToken,
        input.refreshToken,
        input.expiresAt,
        input.calendarId ?? "primary",
        JSON.stringify({ accountEmail }),
      ],
    );
    return mapConnection(rows[0]);
  });
}

export async function updateCalendarOAuthTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null,
): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE calendar_oauth_connections SET
        access_token = $2,
        refresh_token = COALESCE($3, refresh_token),
        expires_at = $4,
        updated_at = NOW()
      WHERE id = $1`,
      [connectionId, accessToken, refreshToken, expiresAt],
    );
  });
}

export async function updateCalendarOAuthSyncState(
  connectionId: string,
  syncToken: string | null,
): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE calendar_oauth_connections SET
        sync_token = $2,
        last_sync_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [connectionId, syncToken],
    );
  });
}

export async function ensureValidAccessToken(
  connection: CalendarOAuthConnection & { accessToken: string; refreshToken: string | null },
): Promise<string> {
  const expiresAt = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) return connection.accessToken;

  const refreshed = await refreshOAuthAccessToken(connection.provider, connection.refreshToken);
  await updateCalendarOAuthTokens(
    connection.id,
    refreshed.accessToken,
    refreshed.refreshToken,
    refreshed.expiresAt,
  );
  return refreshed.accessToken;
}
