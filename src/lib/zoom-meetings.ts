import { getZoomHostUserId, isZoomApiConfigured } from "@/lib/zoom-config";

type ZoomTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: ZoomTokenCache | null = null;

async function getZoomAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID?.trim();
  const clientId = process.env.ZOOM_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET?.trim();
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom API non configurée.");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = new URL("https://zoom.us/oauth/token");
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", accountId);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[zoom] token failed", res.status, text.slice(0, 300));
    throw new Error("Impossible d’obtenir un jeton Zoom.");
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("Réponse Zoom sans access_token.");
  }

  tokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(60, json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

export type ZoomMeetingCreateInput = {
  title: string;
  startsAt: Date;
  endsAt: Date;
};

/**
 * Crée une réunion planifiée Zoom (compte agence S2S) et retourne le join_url.
 */
export async function createZoomMeeting(
  input: ZoomMeetingCreateInput,
): Promise<{ joinUrl: string; meetingId: number | string } | null> {
  if (!isZoomApiConfigured()) return null;

  const accessToken = await getZoomAccessToken();
  const durationMin = Math.max(
    15,
    Math.round((input.endsAt.getTime() - input.startsAt.getTime()) / 60_000) || 60,
  );
  const host = encodeURIComponent(getZoomHostUserId());

  const res = await fetch(`https://api.zoom.us/v2/users/${host}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: input.title.slice(0, 200) || "Réunion SD CREATIV",
      type: 2,
      start_time: input.startsAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
      duration: durationMin,
      timezone: "UTC",
      settings: {
        join_before_host: true,
        waiting_room: false,
        mute_upon_entry: true,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[zoom] create meeting failed", res.status, text.slice(0, 400));
    return null;
  }

  const json = (await res.json()) as {
    id?: number | string;
    join_url?: string;
  };
  if (!json.join_url?.trim()) return null;
  return { joinUrl: json.join_url.trim(), meetingId: json.id ?? "" };
}
