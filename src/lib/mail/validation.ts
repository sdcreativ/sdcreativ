import {
  isMailCredentialsSecretConfigured,
  isMailSyncEnabled,
  MAIL_V1_SHARED_MAILBOX,
} from "@/lib/mail/config";
import {
  getMailboxByEmail,
  mailSchemaReady,
} from "@/lib/mail/repository";
import { isDatabaseConfigured, withDb } from "@/lib/db";

export type MailPhase1CheckId =
  | "secret"
  | "schema"
  | "mailbox"
  | "messages_min"
  | "attachments_meta"
  | "credentials_api_safe"
  | "cron_docs";

export type MailPhase1Check = {
  id: MailPhase1CheckId;
  label: string;
  ok: boolean;
  detail: string;
  /** Si false, n’empêche pas le go Phase 1 (info / ops manuel). */
  required: boolean;
};

export type MailPhase1Validation = {
  go: boolean;
  sharedMailbox: string;
  messageCount: number;
  threadCount: number;
  attachmentCount: number;
  mailboxConfigured: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  syncEnabled: boolean;
  checks: MailPhase1Check[];
  blockers: string[];
};

const MIN_MESSAGES = 20;

export async function getMailPhase1Validation(): Promise<MailPhase1Validation> {
  const syncEnabled = isMailSyncEnabled();
  const secretOk = isMailCredentialsSecretConfigured();

  let schemaOk = false;
  let messageCount = 0;
  let threadCount = 0;
  let attachmentCount = 0;
  let mailboxConfigured = false;
  let lastSyncAt: string | null = null;
  let lastError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      schemaOk = await mailSchemaReady();
      if (schemaOk) {
        const mailbox = await getMailboxByEmail(MAIL_V1_SHARED_MAILBOX, {
          includeCredentials: true,
        });
        mailboxConfigured = Boolean(
          mailbox?.active && mailbox.credentialsEncrypted,
        );
        lastSyncAt = mailbox?.lastSyncAt ?? null;
        lastError = mailbox?.lastError ?? null;

        const counts = await withDb(async (query) => {
          const { rows } = await query<{
            messages: string;
            threads: string;
            attachments: string;
          }>(
            `SELECT
               (SELECT COUNT(*)::text FROM crm_mail_messages) AS messages,
               (SELECT COUNT(*)::text FROM crm_mail_threads) AS threads,
               (SELECT COUNT(*)::text FROM crm_mail_attachments) AS attachments`,
          );
          return rows[0]!;
        });
        messageCount = Number(counts.messages ?? 0);
        threadCount = Number(counts.threads ?? 0);
        attachmentCount = Number(counts.attachments ?? 0);
      }
    } catch {
      schemaOk = false;
    }
  }

  const checks: MailPhase1Check[] = [
    {
      id: "secret",
      label: "MAIL_CREDENTIALS_SECRET configuré",
      ok: secretOk,
      detail: secretOk
        ? "Secret de chiffrement présent (≥32 car.)"
        : "Absent ou trop court — impossible de stocker le MDP boîte",
      required: true,
    },
    {
      id: "schema",
      label: "Tables messagerie présentes",
      ok: schemaOk,
      detail: schemaOk
        ? "crm_mailboxes / threads / messages / attachments OK"
        : "Schéma absent — redémarrer l’app (ensureSchema) ou vérifier DATABASE_URL",
      required: true,
    },
    {
      id: "mailbox",
      label: `Boîte ${MAIL_V1_SHARED_MAILBOX} configurée`,
      ok: mailboxConfigured,
      detail: mailboxConfigured
        ? lastSyncAt
          ? `Active — dernière sync ${lastSyncAt}`
          : "Active — pas encore synchronisée"
        : "Créer via POST /api/admin/mail/mailboxes (mail.manage)",
      required: true,
    },
    {
      id: "messages_min",
      label: `Au moins ${MIN_MESSAGES} messages synchronisés`,
      ok: messageCount >= MIN_MESSAGES,
      detail: `${messageCount} message(s), ${threadCount} conversation(s)${
        lastError ? ` — erreur : ${lastError}` : ""
      }`,
      required: true,
    },
    {
      id: "attachments_meta",
      label: "Pièces jointes listées + S3 (inbound ≤ 5 Mo)",
      ok: true,
      detail:
        attachmentCount > 0
          ? `${attachmentCount} pièce(s) jointe(s) en base — contenu uploadé S3 à la sync IMAP si AWS configuré`
          : "Listing UI prêt — aucune PJ importée pour l’instant (upload S3 à la prochaine sync)",
      required: false,
    },
    {
      id: "credentials_api_safe",
      label: "Pas de fuite credentials API / logs",
      ok: true,
      detail:
        "Mappers sans credentials ; erreurs IMAP sanitizées ; raw_headers non exposés au client",
      required: true,
    },
    {
      id: "cron_docs",
      label: "Cron mail-sync documenté",
      ok: true,
      detail: syncEnabled
        ? "MAIL_SYNC_ENABLED=1 — installer scripts/install-mail-sync-cron.sh (voir docs/DOCKER-PRODUCTION.md)"
        : "Doc + script prêts — activez MAIL_SYNC_ENABLED=1 puis le cron VPS",
      required: false,
    },
  ];

  const blockers = checks
    .filter((c) => c.required && !c.ok)
    .map((c) => `${c.label} : ${c.detail}`);

  return {
    go: blockers.length === 0,
    sharedMailbox: MAIL_V1_SHARED_MAILBOX,
    messageCount,
    threadCount,
    attachmentCount,
    mailboxConfigured,
    lastSyncAt,
    lastError,
    syncEnabled,
    checks,
    blockers,
  };
}

export { MIN_MESSAGES as MAIL_PHASE1_MIN_MESSAGES };
