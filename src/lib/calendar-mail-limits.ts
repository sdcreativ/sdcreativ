/** Limites mail calendrier — safe côté client (pas de `pg` / S3). */

/** Taille max d’un fichier uploadé. */
export const MAX_CALENDAR_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Nombre max de PJ par événement. */
export const MAX_CALENDAR_ATTACHMENTS = 5;

/**
 * Taille totale max des PJ dans un e-mail d’invitation (hors .ics).
 * Resend accepte ~40 Mo ; on garde une marge pour HTML + .ics + base64.
 */
export const MAX_CALENDAR_MAIL_ATTACHMENTS_BYTES = 25 * 1024 * 1024;

export function formatBytesFr(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function sumAttachmentBytes(attachments: Array<{ size?: number | null }>): number {
  return attachments.reduce((sum, a) => sum + (typeof a.size === "number" ? a.size : 0), 0);
}

export function validateCalendarMailAttachments(
  attachments: Array<{ name?: string; size?: number | null }>,
): { ok: true; totalBytes: number } | { ok: false; totalBytes: number; error: string } {
  const totalBytes = sumAttachmentBytes(attachments);
  if (attachments.length > MAX_CALENDAR_ATTACHMENTS) {
    return {
      ok: false,
      totalBytes,
      error: `Maximum ${MAX_CALENDAR_ATTACHMENTS} pièces jointes par événement.`,
    };
  }
  for (const file of attachments) {
    const size = typeof file.size === "number" ? file.size : 0;
    if (size > MAX_CALENDAR_ATTACHMENT_BYTES) {
      return {
        ok: false,
        totalBytes,
        error: `« ${file.name ?? "Fichier"} » dépasse ${formatBytesFr(MAX_CALENDAR_ATTACHMENT_BYTES)} (max par fichier).`,
      };
    }
  }
  if (totalBytes > MAX_CALENDAR_MAIL_ATTACHMENTS_BYTES) {
    return {
      ok: false,
      totalBytes,
      error: `Pièces jointes trop lourdes pour l’e-mail (${formatBytesFr(totalBytes)} / max ${formatBytesFr(MAX_CALENDAR_MAIL_ATTACHMENTS_BYTES)}). Retirez des fichiers ou compressez-les.`,
    };
  }
  return { ok: true, totalBytes };
}
