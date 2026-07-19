/**
 * Monitoring erreurs API intégration 3CX (Sentry + log serveur).
 */

import * as Sentry from "@sentry/nextjs";

export function reportThreeCxError(
  route: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const safeExtra = sanitizeExtra(extra);
  console.error(`[3cx] ${route} failed:`, error, safeExtra);

  Sentry.withScope((scope) => {
    scope.setTag("integration", "3cx");
    scope.setTag("threecx_route", route);
    scope.setLevel("error");
    if (safeExtra) {
      scope.setExtras(safeExtra);
    }
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

function sanitizeExtra(
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("token") ||
      lower.includes("authorization") ||
      lower.includes("password") ||
      lower.includes("secret")
    ) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 120) {
      out[key] = `${value.slice(0, 120)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}
