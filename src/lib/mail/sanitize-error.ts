/**
 * Nettoie les messages d’erreur IMAP/SMTP pour éviter toute fuite
 * de mot de passe ou de chaîne d’auth dans logs / last_error / API.
 */

const SENSITIVE_PATTERNS: RegExp[] = [
  /pass(?:word)?[=:]\s*\S+/gi,
  /auth(?:entication)?[=:]\s*\S+/gi,
  /Bearer\s+\S+/gi,
  /v1:[A-Za-z0-9+/=]+/g,
];

export function sanitizeMailError(error: unknown, fallback = "Erreur messagerie."): string {
  let message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback;

  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, "[redacted]");
  }

  // Tronque les payloads trop longs (stack / dumps).
  message = message.replace(/\s+/g, " ").trim();
  if (message.length > 280) {
    message = `${message.slice(0, 279)}…`;
  }

  return message || fallback;
}
