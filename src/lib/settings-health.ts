import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { CRM_ROLE_LABELS, type CrmRole } from "@/content/crm-roles";
import {
  EMAIL_TEMPLATES,
  type EmailTemplateInfo,
  type IntegrationStatus,
} from "@/content/settings-labels";
import { isSanityConfigured } from "@/lib/cms/types";
import { listClientPortalAccounts } from "@/lib/client-portal-config";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { isS3Configured } from "@/lib/s3";
import { getStorageErrorMessage } from "@/lib/s3-errors";
import { isCinetPayConfigured } from "@/lib/payment-settings";
import {
  getMailPhase0Readiness,
  isHostingerMailWebhookConfigured,
  isMailCredentialsSecretConfigured,
  isMailSyncEnabled,
  MAIL_V1_SHARED_MAILBOX,
} from "@/lib/mail/config";
import { getMailPhase1Validation } from "@/lib/mail/validation";
import { listActiveMailboxes } from "@/lib/mail/repository";
import { readPublicEnv } from "@/lib/env-runtime";
import { BOOKING } from "@/lib/constants";

export type IntegrationHealth = {
  id: string;
  name: string;
  status: IntegrationStatus;
  detail: string;
  hint?: string;
  envVars: string[];
};

export type SettingsHealth = {
  director: { name: string; role: string };
  adminConfigured: boolean;
  portalAccounts: number;
  emailConfigured: boolean;
  emailFrom: string | null;
  emailTo: string | null;
  integrations: IntegrationHealth[];
  emailTemplates: EmailTemplateInfo[];
};

async function checkDatabase(): Promise<IntegrationHealth> {
  const envVars = ["DATABASE_URL"];
  if (!isDatabaseConfigured()) {
    return {
      id: "database",
      name: "PostgreSQL (CRM)",
      status: "missing",
      detail: "Base de données non configurée",
      hint: "Ajoutez DATABASE_URL pour activer leads, clients, projets, etc.",
      envVars,
    };
  }

  try {
    await withDb(async (query) => {
      await query("SELECT 1");
    });
    return {
      id: "database",
      name: "PostgreSQL (CRM)",
      status: "ok",
      detail: "Connexion active",
      envVars,
    };
  } catch {
    return {
      id: "database",
      name: "PostgreSQL (CRM)",
      status: "degraded",
      detail: "Variables présentes mais connexion échouée",
      hint: "Vérifiez que PostgreSQL tourne et que DATABASE_URL est correct.",
      envVars,
    };
  }
}

async function checkS3(): Promise<IntegrationHealth> {
  const envVars = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"];
  if (!isS3Configured()) {
    return {
      id: "s3",
      name: "AWS S3 (documents)",
      status: "missing",
      detail: "Stockage non configuré",
      hint: "Requis pour factures, contrats et livrables dans le CRM.",
      envVars,
    };
  }

  try {
    const client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    await client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET! }));
    return {
      id: "s3",
      name: "AWS S3 (documents)",
      status: "ok",
      detail: `Bucket ${process.env.AWS_S3_BUCKET} accessible`,
      envVars,
    };
  } catch (err) {
    return {
      id: "s3",
      name: "AWS S3 (documents)",
      status: "degraded",
      detail: getStorageErrorMessage(err),
      hint: "Vérifiez les clés IAM et la région du bucket.",
      envVars,
    };
  }
}

function checkResend(): IntegrationHealth {
  const envVars = ["RESEND_API_KEY", "CONTACT_FROM_EMAIL", "CONTACT_TO_EMAIL"];
  const hasKey = Boolean(process.env.RESEND_API_KEY);
  const hasFrom = Boolean(process.env.CONTACT_FROM_EMAIL);
  const hasTo = Boolean(process.env.CONTACT_TO_EMAIL);

  if (!hasKey) {
    return {
      id: "resend",
      name: "Resend (emails)",
      status: "degraded",
      detail: "Mode console — emails logués, non envoyés",
      hint: "Ajoutez RESEND_API_KEY pour l'envoi réel des notifications.",
      envVars,
    };
  }

  if (!hasFrom || !hasTo) {
    return {
      id: "resend",
      name: "Resend (emails)",
      status: "configured",
      detail: "Clé API présente — vérifiez CONTACT_FROM_EMAIL et CONTACT_TO_EMAIL",
      envVars,
    };
  }

  return {
    id: "resend",
    name: "Resend (emails)",
    status: "ok",
    detail: `Envoi depuis ${process.env.CONTACT_FROM_EMAIL}`,
    envVars,
  };
}

function checkAdmin(): IntegrationHealth {
  const envVars = ["ADMIN_SECRET"];
  const configured = Boolean(process.env.ADMIN_SECRET);
  return {
    id: "admin",
    name: "Authentification admin",
    status: configured ? "ok" : "missing",
    detail: configured ? "Protection CRM active (cookie session)" : "CRM admin inaccessible",
    hint: configured ? undefined : "Définissez ADMIN_SECRET pour sécuriser /admin.",
    envVars,
  };
}

function checkBooking(): IntegrationHealth {
  const envVars = ["NEXT_PUBLIC_BOOKING_URL"];
  const bookingUrl = readPublicEnv("NEXT_PUBLIC_BOOKING_URL") || BOOKING.url;
  if (!bookingUrl) {
    return {
      id: "booking",
      name: "Cal.com (RDV)",
      status: "missing",
      detail: "Prise de RDV désactivée",
      hint: "Ajoutez NEXT_PUBLIC_BOOKING_URL pour activer Cal.com.",
      envVars,
    };
  }
  return {
    id: "booking",
    name: "Cal.com (RDV)",
    status: "ok",
    detail: "Lien de réservation configuré",
    envVars,
  };
}

function checkSanity(): IntegrationHealth {
  const envVars = ["SANITY_PROJECT_ID", "SANITY_DATASET", "SANITY_API_TOKEN"];
  if (!isSanityConfigured()) {
    return {
      id: "sanity",
      name: "Sanity CMS",
      status: "missing",
      detail: "Contenu statique local utilisé",
      hint: "Optionnel — pour blog et réalisations dynamiques.",
      envVars,
    };
  }
  return {
    id: "sanity",
    name: "Sanity CMS",
    status: "configured",
    detail: "CMS headless configuré",
    envVars,
  };
}

function checkOpenAI(): IntegrationHealth {
  const envVars = ["OPENAI_API_KEY", "OPENAI_MODEL"];
  if (!process.env.OPENAI_API_KEY) {
    return {
      id: "openai",
      name: "OpenAI (chat widget)",
      status: "degraded",
      detail: "Réponses basées sur la base de connaissances locale",
      hint: "Optionnel — OPENAI_API_KEY pour enrichir le chat.",
      envVars,
    };
  }
  return {
    id: "openai",
    name: "OpenAI (chat widget)",
    status: "ok",
    detail: `Modèle ${process.env.OPENAI_MODEL ?? "gpt-4o-mini"}`,
    envVars,
  };
}

function checkCinetPay(): IntegrationHealth {
  const envVars = ["CINETPAY_API_KEY", "CINETPAY_SITE_ID"];
  if (!isCinetPayConfigured()) {
    return {
      id: "cinetpay",
      name: "CinetPay (paiements)",
      status: "missing",
      detail: "Paiement en ligne désactivé",
      hint: "Ajoutez CINETPAY_API_KEY et CINETPAY_SITE_ID pour activer le bouton « Payer en ligne ».",
      envVars,
    };
  }
  return {
    id: "cinetpay",
    name: "CinetPay (paiements)",
    status: "ok",
    detail: "Passerelle configurée (carte + Mobile Money CI)",
    envVars,
  };
}

async function checkMailMessagerie(): Promise<IntegrationHealth> {
  const envVars = [
    "MAIL_CREDENTIALS_SECRET",
    "MAIL_SYNC_ENABLED",
    "MAIL_IMAP_HOST",
    "MAIL_SMTP_HOST",
    "HOSTINGER_MAIL_WEBHOOK_SECRET",
  ];
  const readiness = getMailPhase0Readiness();

  if (!isMailCredentialsSecretConfigured()) {
    return {
      id: "mail",
      name: "Messagerie (Hostinger)",
      status: "missing",
      detail: "Phase 0 — secret de chiffrement absent",
      hint: `Ajoutez MAIL_CREDENTIALS_SECRET (≥32 car.) avant la sync IMAP de ${MAIL_V1_SHARED_MAILBOX}.`,
      envVars,
    };
  }

  if (isDatabaseConfigured()) {
    try {
      const [validation, activeBoxes] = await Promise.all([
        getMailPhase1Validation(),
        listActiveMailboxes(),
      ]);

      const withError = activeBoxes.filter((b) => Boolean(b.lastError));
      const synced = activeBoxes.filter((b) => Boolean(b.lastSyncAt));
      const boxesSummary =
        activeBoxes.length === 0
          ? "aucune boîte active"
          : `${synced.length}/${activeBoxes.length} sync OK` +
            (withError.length > 0 ? `, ${withError.length} erreur(s)` : "");

      const lastSyncHint = activeBoxes
        .slice(0, 4)
        .map((b) => {
          if (b.lastError) return `${b.email}: erreur`;
          if (!b.lastSyncAt) return `${b.email}: jamais`;
          const t = new Date(b.lastSyncAt).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return `${b.email}: ${t}`;
        })
        .join(" · ");

      if (withError.length > 0) {
        return {
          id: "mail",
          name: "Messagerie (Hostinger)",
          status: "degraded",
          detail: `Boîtes : ${boxesSummary}`,
          hint: lastSyncHint || withError[0]?.lastError || "Vérifiez les MDP IMAP.",
          envVars,
        };
      }

      if (validation.go && activeBoxes.length > 0) {
        const webhookHint = isHostingerMailWebhookConfigured()
          ? "Webhook Agentic Mail actif (+ cron fallback)."
          : "Optionnel : HOSTINGER_MAIL_WEBHOOK_SECRET + webhook hPanel pour le temps réel.";
        return {
          id: "mail",
          name: "Messagerie (Hostinger)",
          status: "ok",
          detail: `${validation.messageCount} msg — ${boxesSummary}`,
          hint:
            lastSyncHint ||
            (validation.syncEnabled
              ? `Cron mail-sync 5 min. ${webhookHint}`
              : `Activez MAIL_SYNC_ENABLED=1 + cron. ${webhookHint}`),
          envVars,
        };
      }

      const blocker = validation.blockers[0];
      return {
        id: "mail",
        name: "Messagerie (Hostinger)",
        status: validation.mailboxConfigured || activeBoxes.length > 0 ? "configured" : "missing",
        detail: blocker
          ? `En cours — ${blocker}`
          : `En cours (${validation.messageCount} messages, ${boxesSummary})`,
        hint: lastSyncHint || "Messagerie CRM → Synchroniser / Connecter boîte.",
        envVars,
      };
    } catch {
      // fallback env-only ci-dessous
    }
  }

  if (!isMailSyncEnabled()) {
    return {
      id: "mail",
      name: "Messagerie (Hostinger)",
      status: "configured",
      detail: `Prêt — sync off (${MAIL_V1_SHARED_MAILBOX})`,
      hint: "Configurez la boîte puis synchronisez depuis Messagerie ; activez MAIL_SYNC_ENABLED=1 + cron.",
      envVars,
    };
  }

  if (!readiness.go) {
    return {
      id: "mail",
      name: "Messagerie (Hostinger)",
      status: "missing",
      detail: readiness.blockers[0] ?? "Configuration incomplète",
      hint: readiness.blockers.join(" "),
      envVars,
    };
  }

  return {
    id: "mail",
    name: "Messagerie (Hostinger)",
    status: "ok",
    detail: `Sync activée — ${MAIL_V1_SHARED_MAILBOX} + boîtes individuelles`,
    envVars,
  };
}

function checkAnalytics(): IntegrationHealth {
  const envVars = ["NEXT_PUBLIC_GA_MEASUREMENT_ID"];
  const gaId = readPublicEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID");
  if (!gaId) {
    return {
      id: "analytics",
      name: "Google Analytics",
      status: "missing",
      detail: "Mesure d'audience désactivée",
      hint: "Optionnel — NEXT_PUBLIC_GA_MEASUREMENT_ID (G-…).",
      envVars,
    };
  }
  return {
    id: "analytics",
    name: "Google Analytics",
    status: "configured",
    detail: "ID de mesure configuré",
    envVars,
  };
}

export async function getSettingsHealth(session?: {
  name: string;
  role: CrmRole;
  roleLabel?: string;
} | null): Promise<SettingsHealth> {
  const [database, s3, mail] = await Promise.all([
    checkDatabase(),
    checkS3(),
    checkMailMessagerie(),
  ]);

  const integrations = [
    checkAdmin(),
    database,
    s3,
    checkResend(),
    checkCinetPay(),
    mail,
    checkBooking(),
    checkSanity(),
    checkOpenAI(),
    checkAnalytics(),
  ];

  const director = session
    ? {
        name: session.name,
        role:
          session.roleLabel ??
          CRM_ROLE_LABELS[session.role as keyof typeof CRM_ROLE_LABELS] ??
          session.role,
      }
    : { name: "—", role: "Session inactive" };

  return {
    director,
    adminConfigured: Boolean(process.env.ADMIN_SECRET),
    portalAccounts: listClientPortalAccounts().length,
    emailConfigured: Boolean(process.env.RESEND_API_KEY),
    emailFrom: process.env.CONTACT_FROM_EMAIL ?? null,
    emailTo: process.env.CONTACT_TO_EMAIL ?? null,
    integrations,
    emailTemplates: EMAIL_TEMPLATES,
  };
}
