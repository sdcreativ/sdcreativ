import { z } from "zod";
import { withDb } from "@/lib/db";

export type CrmSecuritySettings = {
  sessionMaxHours: number;
  webhooks: {
    genericUrl: string;
    slackUrl: string;
    discordUrl: string;
    notifyLeadCreated: boolean;
    notifyTicketSla: boolean;
    notifyQuoteSigned: boolean;
    notifyInvoicePaid: boolean;
    notifyClientCreated: boolean;
  };
};

export const DEFAULT_CRM_SECURITY: CrmSecuritySettings = {
  sessionMaxHours: 8,
  webhooks: {
    genericUrl: "",
    slackUrl: "",
    discordUrl: "",
    notifyLeadCreated: true,
    notifyTicketSla: true,
    notifyQuoteSigned: true,
    notifyInvoicePaid: true,
    notifyClientCreated: true,
  },
};

const securitySchema = z.object({
  sessionMaxHours: z.number().int().min(1).max(720).optional(),
  webhooks: z
    .object({
      genericUrl: z.string().trim().max(500).optional(),
      slackUrl: z.string().trim().max(500).optional(),
      discordUrl: z.string().trim().max(500).optional(),
      notifyLeadCreated: z.boolean().optional(),
      notifyTicketSla: z.boolean().optional(),
      notifyQuoteSigned: z.boolean().optional(),
      notifyInvoicePaid: z.boolean().optional(),
      notifyClientCreated: z.boolean().optional(),
    })
    .optional(),
});

function mergeSecurity(stored: Partial<CrmSecuritySettings> | null): CrmSecuritySettings {
  return {
    sessionMaxHours: stored?.sessionMaxHours ?? DEFAULT_CRM_SECURITY.sessionMaxHours,
    webhooks: {
      ...DEFAULT_CRM_SECURITY.webhooks,
      ...(stored?.webhooks ?? {}),
    },
  };
}

export async function getCrmSecuritySettings(): Promise<CrmSecuritySettings> {
  const envHours = Number(process.env.ADMIN_SESSION_MAX_HOURS);
  const base = mergeSecurity(null);
  if (!Number.isNaN(envHours) && envHours > 0) {
    base.sessionMaxHours = envHours;
  }

  return withDb(async (query) => {
    const { rows } = await query<{ security: Partial<CrmSecuritySettings> | null }>(
      `SELECT security FROM crm_settings WHERE id = 1`,
    );
    const merged = mergeSecurity(rows[0]?.security ?? null);
    if (!Number.isNaN(envHours) && envHours > 0) {
      merged.sessionMaxHours = envHours;
    }
    merged.webhooks.genericUrl ||= process.env.CRM_WEBHOOK_URL ?? "";
    merged.webhooks.slackUrl ||= process.env.SLACK_WEBHOOK_URL ?? "";
    merged.webhooks.discordUrl ||= process.env.DISCORD_WEBHOOK_URL ?? "";
    return merged;
  }).catch(() => {
    const fallback = mergeSecurity(null);
    fallback.webhooks.genericUrl = process.env.CRM_WEBHOOK_URL ?? "";
    fallback.webhooks.slackUrl = process.env.SLACK_WEBHOOK_URL ?? "";
    fallback.webhooks.discordUrl = process.env.DISCORD_WEBHOOK_URL ?? "";
    return fallback;
  });
}

export async function updateCrmSecuritySettings(
  input: z.infer<typeof securitySchema>,
): Promise<CrmSecuritySettings> {
  return withDb(async (query) => {
    const current = await getCrmSecuritySettings();
    const next: CrmSecuritySettings = {
      sessionMaxHours: input.sessionMaxHours ?? current.sessionMaxHours,
      webhooks: {
        ...current.webhooks,
        ...(input.webhooks ?? {}),
      },
    };

    await query(
      `INSERT INTO crm_settings (id, security, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET security = $1, updated_at = NOW()`,
      [JSON.stringify(next)],
    );
    return next;
  });
}

export async function getSessionMaxAgeSeconds(): Promise<number> {
  const settings = await getCrmSecuritySettings();
  return settings.sessionMaxHours * 3600;
}

export { securitySchema };
