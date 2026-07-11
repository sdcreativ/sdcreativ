import { z } from "zod";
import { getClientByPortalId, updateClient, type Client } from "@/lib/clients";

export type ClientPortalNotificationPrefs = {
  notifyQuotes: boolean;
  notifyInvoices: boolean;
  notifyMessages: boolean;
  notifyReminders: boolean;
};

export type ClientPortalSettingsPayload = {
  portalClientId: string;
  crmClientId: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notifications: ClientPortalNotificationPrefs;
  hasDatabaseAccess: boolean;
  accessCreatedAt: string | null;
};

const METADATA_KEY = "portalSettings";

export const DEFAULT_PORTAL_NOTIFICATION_PREFS: ClientPortalNotificationPrefs = {
  notifyQuotes: true,
  notifyInvoices: true,
  notifyMessages: true,
  notifyReminders: true,
};

const notificationPrefsSchema = z.object({
  notifyQuotes: z.boolean().optional(),
  notifyInvoices: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
});

export const updatePortalSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  phone: z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(160).optional().nullable(),
  notifications: notificationPrefsSchema.optional(),
});

export function portalNotificationPrefAllows(
  metadata: Record<string, unknown>,
  key: keyof ClientPortalNotificationPrefs,
): boolean {
  return readNotificationPrefs(metadata)[key];
}

function readNotificationPrefs(metadata: Record<string, unknown>): ClientPortalNotificationPrefs {
  const raw = metadata[METADATA_KEY];
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_PORTAL_NOTIFICATION_PREFS };
  }

  const prefs = raw as Partial<ClientPortalNotificationPrefs>;
  return {
    notifyQuotes: prefs.notifyQuotes ?? DEFAULT_PORTAL_NOTIFICATION_PREFS.notifyQuotes,
    notifyInvoices: prefs.notifyInvoices ?? DEFAULT_PORTAL_NOTIFICATION_PREFS.notifyInvoices,
    notifyMessages: prefs.notifyMessages ?? DEFAULT_PORTAL_NOTIFICATION_PREFS.notifyMessages,
    notifyReminders: prefs.notifyReminders ?? DEFAULT_PORTAL_NOTIFICATION_PREFS.notifyReminders,
  };
}

export async function getPortalSettingsPayload(
  portalClientId: string,
): Promise<ClientPortalSettingsPayload | null> {
  const client = await getClientByPortalId(portalClientId);
  if (!client) return null;

  const { withDb } = await import("@/lib/db");
  const accessRow = await withDb(async (query) => {
    const { rows } = await query<{
      portal_access_token_hash: string | null;
      portal_access_created_at: Date | null;
    }>(
      `SELECT portal_access_token_hash, portal_access_created_at FROM clients WHERE id = $1`,
      [client.id],
    );
    return rows[0] ?? null;
  });

  return {
    portalClientId,
    crmClientId: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    notifications: readNotificationPrefs(client.metadata),
    hasDatabaseAccess: Boolean(accessRow?.portal_access_token_hash),
    accessCreatedAt: accessRow?.portal_access_created_at?.toISOString() ?? null,
  };
}

export async function updatePortalSettings(
  portalClientId: string,
  input: z.infer<typeof updatePortalSettingsSchema>,
): Promise<ClientPortalSettingsPayload | null> {
  const client = await getClientByPortalId(portalClientId);
  if (!client) return null;

  const metadata = { ...client.metadata };
  const currentPrefs = readNotificationPrefs(metadata);

  if (input.notifications) {
    metadata[METADATA_KEY] = {
      ...currentPrefs,
      ...input.notifications,
    };
  }

  await updateClient(client.id, {
    name: input.name,
    phone: input.phone,
    company: input.company,
    metadata,
  });

  return getPortalSettingsPayload(portalClientId);
}

export function clientForPortal(client: Client, portalClientId: string): boolean {
  return client.portalClientId === portalClientId;
}
