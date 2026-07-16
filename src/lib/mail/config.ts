/**
 * Cadrage Messagerie CRM (Phase 0) — décisions figées avant sync IMAP.
 * Resend reste le canal transactionnel ; Hostinger IMAP/SMTP pour la messagerie conversationnelle.
 */

export const HOSTINGER_MAIL = {
  imapHost: "imap.hostinger.com",
  imapPort: 993,
  smtpHost: "smtp.hostinger.com",
  /** SSL implicite (recommandé Hostinger). */
  smtpPortSsl: 465,
  /** STARTTLS si le client l’exige. */
  smtpPortStartTls: 587,
  webmailUrl: "https://webmail.hostinger.com",
  emailPanelUrl: "https://hpanel.hostinger.com/emails",
} as const;

/** Libs retenues pour Phase 1+ (à installer au démarrage Phase 1). */
export const MAIL_STACK = {
  imap: "imapflow",
  smtp: "nodemailer",
} as const;

/**
 * Boîte synchronisée en v1 — partagée, pas de boîtes individuelles (Phase 4).
 * Identifiants stockés chiffrés en base (pas en clair dans .env).
 */
export const MAIL_V1_SHARED_MAILBOX = "contact@sdcreativ.com";

/** Compte dédié sync@ : non — on réutilise contact@ (moins de boîtes à gérer). */
export const MAIL_V1_USE_DEDICATED_SYNC_ACCOUNT = false;

/**
 * Limites / bonnes pratiques Hostinger (à respecter côté sync).
 * Sources : doc Hostinger Email + Kodee hPanel (IMAP/SMTP).
 */
export const HOSTINGER_MAIL_LIMITS = {
  /** Intervalle cron recommandé (évite le hammering IMAP). */
  syncIntervalMinutesMin: 2,
  syncIntervalMinutesRecommended: 5,
  /** Ne pas ouvrir trop de connexions IMAP simultanées. */
  maxConcurrentImapConnections: 1,
  /** Taille max pièce jointe raisonnable avant stocker hors DB (S3). */
  attachmentInlineMaxBytes: 5 * 1024 * 1024,
  notes: [
    "Auth IMAP/SMTP : adresse complète + mot de passe de la boîte.",
    "Ne pas supprimer les MX Hostinger ni le SPF combiné Hostinger+Resend.",
    "Agentic Mail (API/webhooks) est optionnel (Phase 5) — ne crée pas de boîtes.",
    "Quota stockage : selon plan Premium Business Email (surveiller dans hPanel).",
  ],
} as const;

export function getMailImapHost(): string {
  return process.env.MAIL_IMAP_HOST?.trim() || HOSTINGER_MAIL.imapHost;
}

export function getMailImapPort(): number {
  const raw = Number(process.env.MAIL_IMAP_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : HOSTINGER_MAIL.imapPort;
}

export function getMailSmtpHost(): string {
  return process.env.MAIL_SMTP_HOST?.trim() || HOSTINGER_MAIL.smtpHost;
}

export function getMailSmtpPort(): number {
  const raw = Number(process.env.MAIL_SMTP_PORT);
  return Number.isFinite(raw) && raw > 0 ? raw : HOSTINGER_MAIL.smtpPortSsl;
}

/** Feature flag — sync désactivée tant que Phase 1 n’est pas déployée / configurée. */
export function isMailSyncEnabled(): boolean {
  const flag = process.env.MAIL_SYNC_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function isMailCredentialsSecretConfigured(): boolean {
  const secret = process.env.MAIL_CREDENTIALS_SECRET?.trim() ?? "";
  return secret.length >= 32;
}

/** Secret Bearer pour POST /api/webhooks/hostinger-mail (Agentic Mail hPanel). */
export function getHostingerMailWebhookSecret(): string {
  return process.env.HOSTINGER_MAIL_WEBHOOK_SECRET?.trim() ?? "";
}

export function isHostingerMailWebhookConfigured(): boolean {
  return getHostingerMailWebhookSecret().length >= 16;
}

export type MailPhase0Readiness = {
  go: boolean;
  syncEnabled: boolean;
  credentialsSecretOk: boolean;
  sharedMailbox: string;
  stack: typeof MAIL_STACK;
  blockers: string[];
  warnings: string[];
};

/** Note go / no-go pour démarrer la Phase 1. */
export function getMailPhase0Readiness(): MailPhase0Readiness {
  const credentialsSecretOk = isMailCredentialsSecretConfigured();
  const syncEnabled = isMailSyncEnabled();
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!credentialsSecretOk) {
    blockers.push(
      "MAIL_CREDENTIALS_SECRET manquant ou trop court (min. 32 caractères) — requis pour chiffrer les mots de passe boîte.",
    );
  }

  if (syncEnabled && !credentialsSecretOk) {
    blockers.push("MAIL_SYNC_ENABLED=1 mais le secret de chiffrement est absent.");
  }

  if (!syncEnabled) {
    warnings.push("MAIL_SYNC_ENABLED n’est pas activé — normal jusqu’à la Phase 1.");
  }

  warnings.push(
    `Boîte partagée : ${MAIL_V1_SHARED_MAILBOX} ; boîtes individuelles liées via user_id (Phase 4).`,
  );

  return {
    go: blockers.length === 0,
    syncEnabled,
    credentialsSecretOk,
    sharedMailbox: MAIL_V1_SHARED_MAILBOX,
    stack: MAIL_STACK,
    blockers,
    warnings,
  };
}
