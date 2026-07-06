export type CalendarOAuthProvider = "google" | "microsoft";

export const CALENDAR_OAUTH_PROVIDERS: CalendarOAuthProvider[] = ["google", "microsoft"];

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function isCalendarOAuthConfigured(provider: CalendarOAuthProvider): boolean {
  return provider === "google" ? isGoogleOAuthConfigured() : isMicrosoftOAuthConfigured();
}

export function getOAuthRedirectUri(provider: CalendarOAuthProvider): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/admin/calendar/oauth/${provider}/callback`;
}

export function getGoogleOAuthScopes(): string {
  return [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");
}

export function getMicrosoftOAuthScopes(): string {
  return "offline_access User.Read Calendars.ReadWrite";
}
