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

function extractImapDetail(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const err = error as {
    message?: string;
    responseText?: string;
    responseStatus?: string;
    serverResponseCode?: string;
    authenticationFailed?: boolean;
    response?: string | { text?: string; command?: string };
  };

  if (err.authenticationFailed) {
    return "Authentification IMAP refusée — vérifiez le mot de passe Hostinger.";
  }

  const parts: string[] = [];
  if (err.serverResponseCode) parts.push(String(err.serverResponseCode));
  if (err.responseText) parts.push(String(err.responseText));
  else if (typeof err.response === "string") parts.push(err.response);
  else if (err.response && typeof err.response === "object" && err.response.text) {
    parts.push(String(err.response.text));
  }

  if (parts.length > 0) return parts.join(" — ");
  return null;
}

export function sanitizeMailError(error: unknown, fallback = "Erreur messagerie."): string {
  const detail = extractImapDetail(error);
  let message =
    detail ||
    (error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : fallback);

  // Remplace le générique imapflow
  if (/^command failed$/i.test(message.trim()) && detail) {
    message = detail;
  } else if (/^command failed$/i.test(message.trim())) {
    message =
      "Commande IMAP refusée par Hostinger (plage UID, auth ou boîte). Réessayez Sync ou mettez à jour le mot de passe.";
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    message = message.replace(pattern, "[redacted]");
  }

  message = message.replace(/\s+/g, " ").trim();
  if (message.length > 280) {
    message = `${message.slice(0, 279)}…`;
  }

  return message || fallback;
}
