import { createHash, randomBytes } from "node:crypto";
import { withDb } from "@/lib/db";
import { getClientById, getClientByPortalId, updateClient, type Client } from "@/lib/clients";
import { validateClientCredentials as validateEnvCredentials } from "@/lib/client-portal-config";
import { buildPortalAccessEmailHtml } from "@/lib/client-portal-access-email";
import { sendEmail } from "@/lib/email";
import { logCrmAudit, type AuditActor } from "@/lib/crm-audit";

export type PortalAccessStatus = {
  portalClientId: string | null;
  hasAccess: boolean;
  hasEnvToken: boolean;
  hasDatabaseToken: boolean;
  createdAt: string | null;
  lastSentAt: string | null;
};

type PortalAccessRow = {
  portal_client_id: string | null;
  portal_access_token_hash: string | null;
  portal_access_created_at: Date | null;
  portal_access_last_sent_at: Date | null;
};

export class PortalAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalAccessError";
  }
}

function slugifyPortalId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function generatePortalAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashPortalAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function getPortalAccessRow(clientId: string): Promise<PortalAccessRow | null> {
  return withDb(async (query) => {
    const { rows } = await query<PortalAccessRow>(
      `SELECT portal_client_id, portal_access_token_hash,
              portal_access_created_at, portal_access_last_sent_at
       FROM clients WHERE id = $1`,
      [clientId],
    );
    return rows[0] ?? null;
  });
}

export async function getPortalAccessStatus(clientId: string): Promise<PortalAccessStatus> {
  const row = await getPortalAccessRow(clientId);
  if (!row) {
    throw new PortalAccessError("Client introuvable.");
  }

  const portalClientId = row.portal_client_id;
  const { parseClientPortalConfig } = await import("@/lib/client-portal-config");
  const envHasToken = portalClientId ? Boolean(parseClientPortalConfig()[portalClientId]) : false;

  return {
    portalClientId,
    hasAccess: Boolean(row.portal_access_token_hash) || envHasToken,
    hasEnvToken: envHasToken,
    hasDatabaseToken: Boolean(row.portal_access_token_hash),
    createdAt: row.portal_access_created_at?.toISOString() ?? null,
    lastSentAt: row.portal_access_last_sent_at?.toISOString() ?? null,
  };
}

export async function validatePortalAccessCredentials(
  portalClientId: string,
  token: string,
): Promise<boolean> {
  if (validateEnvCredentials(portalClientId, token)) {
    return true;
  }

  const client = await getClientByPortalId(portalClientId);
  if (!client) return false;

  const row = await getPortalAccessRow(client.id);
  if (!row?.portal_access_token_hash) return false;

  const hash = hashPortalAccessToken(token);
  return hash === row.portal_access_token_hash;
}

async function ensureUniquePortalClientId(client: Client): Promise<string> {
  if (client.portalClientId) return client.portalClientId;

  const base = slugifyPortalId(client.company || client.name || client.email.split("@")[0] || "client");
  let candidate = base || `client-${client.id.slice(0, 8)}`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await getClientByPortalId(candidate);
    if (!existing || existing.id === client.id) {
      await updateClient(client.id, { portalClientId: candidate });
      return candidate;
    }
    candidate = `${base}-${client.id.slice(0, 8)}${attempt > 0 ? `-${attempt}` : ""}`;
  }

  throw new PortalAccessError("Impossible de générer un identifiant espace client unique.");
}

async function persistPortalAccessToken(
  clientId: string,
  tokenHash: string,
  markSent: boolean,
): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE clients SET
        portal_access_token_hash = $2,
        portal_access_created_at = COALESCE(portal_access_created_at, NOW()),
        portal_access_last_sent_at = CASE WHEN $3 THEN NOW() ELSE portal_access_last_sent_at END,
        updated_at = NOW()
      WHERE id = $1`,
      [clientId, tokenHash, markSent],
    );
  });
}

async function sendPortalAccessEmailToClient(input: {
  client: Client;
  portalClientId: string;
  plainToken: string;
  isRotation?: boolean;
}): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const html = buildPortalAccessEmailHtml({
    clientName: input.client.name,
    portalClientId: input.portalClientId,
    accessCode: input.plainToken,
    siteUrl,
    isRotation: input.isRotation,
  });

  return sendEmail({
    to: input.client.email,
    subject: input.isRotation
      ? "Nouveau code d'accès — Espace client SD CREATIV"
      : "Vos accès — Espace client SD CREATIV",
    html,
    replyTo: process.env.CONTACT_FROM_EMAIL ?? undefined,
  });
}

export async function generateClientPortalAccess(input: {
  clientId: string;
  actor: AuditActor;
  sendEmail?: boolean;
  emailMode?: "welcome" | "rotation";
  skipAudit?: boolean;
}): Promise<{
  client: Client;
  portalClientId: string;
  plainToken: string;
  emailSent: boolean;
}> {
  const client = await getClientById(input.clientId);
  if (!client) throw new PortalAccessError("Client introuvable.");

  const portalClientId = await ensureUniquePortalClientId(client);
  const plainToken = generatePortalAccessToken();
  const tokenHash = hashPortalAccessToken(plainToken);
  const sendEmailFlag = input.sendEmail !== false;

  await persistPortalAccessToken(client.id, tokenHash, sendEmailFlag);

  let emailSent = false;
  const refreshed = await getClientById(client.id);
  if (!refreshed) throw new PortalAccessError("Client introuvable.");

  if (sendEmailFlag) {
    emailSent = await sendPortalAccessEmailToClient({
      client: refreshed,
      portalClientId,
      plainToken,
      isRotation: input.emailMode === "rotation",
    });
    if (emailSent) {
      await withDb(async (query) => {
        await query(
          `UPDATE clients SET portal_access_last_sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [client.id],
        );
      });
    }
  }

  if (!input.skipAudit) {
    await logCrmAudit({
      actor: input.actor,
      action: "client.portal_access.generate",
      entityType: "client",
      entityId: client.id,
      summary: `Génération des accès espace client pour ${refreshed.company || refreshed.name}`,
      metadata: { portalClientId, emailSent },
    });
  }

  const updated = await getClientById(client.id);
  if (!updated) throw new PortalAccessError("Client introuvable.");

  return { client: updated, portalClientId, plainToken, emailSent };
}

export async function resendClientPortalAccess(input: {
  clientId: string;
  actor: AuditActor;
}): Promise<{
  client: Client;
  portalClientId: string;
  plainToken: string;
  emailSent: boolean;
}> {
  const status = await getPortalAccessStatus(input.clientId);
  if (!status.portalClientId && !status.hasDatabaseToken && !status.hasEnvToken) {
    throw new PortalAccessError("Générez d'abord un accès espace client.");
  }

  const result = await generateClientPortalAccess({
    clientId: input.clientId,
    actor: input.actor,
    sendEmail: true,
    emailMode: "rotation",
    skipAudit: true,
  });

  await logCrmAudit({
    actor: input.actor,
    action: "client.portal_access.resend",
    entityType: "client",
    entityId: input.clientId,
    summary: `Renvoi du code d'accès espace client (${result.portalClientId})`,
    metadata: { emailSent: result.emailSent, rotated: true },
  });

  return result;
}

export async function revokeClientPortalAccess(input: {
  clientId: string;
  actor: AuditActor;
}): Promise<Client> {
  const client = await getClientById(input.clientId);
  if (!client) throw new PortalAccessError("Client introuvable.");

  await withDb(async (query) => {
    await query(
      `UPDATE clients SET
        portal_access_token_hash = NULL,
        updated_at = NOW()
      WHERE id = $1`,
      [client.id],
    );
  });

  await logCrmAudit({
    actor: input.actor,
    action: "client.portal_access.revoke",
    entityType: "client",
    entityId: client.id,
    summary: `Révocation de l'accès espace client pour ${client.company || client.name}`,
    metadata: { portalClientId: client.portalClientId },
  });

  const updated = await getClientById(client.id);
  if (!updated) throw new PortalAccessError("Client introuvable.");
  return updated;
}
