import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { auditCrmAction } from "@/lib/crm-audit-actions";
import { roleHasPermission } from "@/lib/crm-permissions";
import { isCrmTeamEmail } from "@/lib/crm-team-email";
import { getCrmUserById } from "@/lib/crm-users";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import {
  getMailImapHost,
  getMailImapPort,
  getMailSmtpHost,
  getMailSmtpPort,
  isMailCredentialsSecretConfigured,
  MAIL_V1_SHARED_MAILBOX,
} from "@/lib/mail/config";
import { encryptMailboxCredentials } from "@/lib/mail/crypto";
import {
  listMailboxes,
  listMailboxesVisibleToUser,
  upsertMailbox,
} from "@/lib/mail/repository";
import { sanitizeMailError } from "@/lib/mail/sanitize-error";

const createMailboxSchema = z.object({
  email: z.string().trim().email().max(255),
  displayName: z.string().trim().max(160).optional(),
  password: z.string().min(1).max(256),
  imapHost: z.string().trim().max(255).optional(),
  imapPort: z.number().int().positive().optional(),
  smtpHost: z.string().trim().max(255).optional(),
  smtpPort: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  /** Lie la boîte à un membre CRM (admin). Sinon résolu via email. */
  userId: z.string().uuid().nullable().optional(),
});

async function findCrmUserIdByEmail(email: string): Promise<string | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM crm_users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email],
    );
    return rows[0]?.id ?? null;
  });
}

export async function GET() {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const canManage = roleHasPermission(session.role, "mail.manage");
    const mailboxes = canManage
      ? await listMailboxes()
      : await listMailboxesVisibleToUser({
          userId: session.userId,
          userEmail: session.email,
        });

    return NextResponse.json({ mailboxes });
  } catch (error) {
    console.error("[api/admin/mail/mailboxes] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/**
 * Crée / met à jour une boîte (credentials chiffrés).
 * - mail.manage : toute boîte @domaine ou contact@
 * - mail.write : uniquement sa propre adresse pro
 */
export async function POST(request: Request) {
  const authError = await requireAdminAuth({
    anyPermission: ["mail.manage", "mail.write"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  if (!isMailCredentialsSecretConfigured()) {
    return NextResponse.json(
      {
        error:
          "MAIL_CREDENTIALS_SECRET manquant (≥32 caractères). Impossible de chiffrer le mot de passe.",
      },
      { status: 503 },
    );
  }

  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createMailboxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const canManage = roleHasPermission(session.role, "mail.manage");
    const sessionEmail = session.email.toLowerCase();

    let userId: string | null = null;

    if (email === MAIL_V1_SHARED_MAILBOX) {
      if (!canManage) {
        return NextResponse.json(
          { error: "Seul un admin peut configurer la boîte partagée." },
          { status: 403 },
        );
      }
      userId = null;
    } else if (!isCrmTeamEmail(email)) {
      return NextResponse.json(
        { error: "Seules les boîtes @domaine équipe ou contact@ sont autorisées." },
        { status: 400 },
      );
    } else if (!canManage) {
      if (email !== sessionEmail) {
        return NextResponse.json(
          { error: "Vous ne pouvez connecter que votre propre boîte professionnelle." },
          { status: 403 },
        );
      }
      userId = session.userId;
    } else {
      // Admin : userId explicite ou résolution par email
      if (parsed.data.userId) {
        const user = await getCrmUserById(parsed.data.userId);
        if (!user) {
          return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
        }
        userId = user.id;
      } else {
        userId = await findCrmUserIdByEmail(email);
      }
    }

    // Ne jamais logger le mot de passe
    const credentialsEncrypted = encryptMailboxCredentials({
      email,
      password: parsed.data.password,
    });

    const mailbox = await upsertMailbox({
      email,
      displayName: parsed.data.displayName,
      imapHost: parsed.data.imapHost ?? getMailImapHost(),
      imapPort: parsed.data.imapPort ?? getMailImapPort(),
      smtpHost: parsed.data.smtpHost ?? getMailSmtpHost(),
      smtpPort: parsed.data.smtpPort ?? getMailSmtpPort(),
      credentialsEncrypted,
      active: parsed.data.active ?? true,
      userId,
    });

    await auditCrmAction({
      action: "upsert",
      entityType: "mail_mailbox",
      entityId: mailbox.id,
      summary: `Boîte messagerie configurée : ${mailbox.email}`,
      metadata: { userId, actor: session.email },
    });

    return NextResponse.json({ mailbox }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/mail/mailboxes] POST", sanitizeMailError(error));
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
