import { z } from "zod";

const incidentWebhookSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.string(),
  eventType: z.string(),
});

const incidentDocumentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
});

const incidentSyncSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.string(),
  operation: z.string(),
});

const incidentAlertSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  threshold: z.number(),
});

export const kodivaModuleSnapshotSchema = z.object({
  product: z.literal("KODIVA"),
  generatedAt: z.string(),
  links: z.object({
    home: z.string(),
    embed: z.string(),
    tenants: z.string(),
    users: z.string().optional(),
    usage: z.string().optional(),
    ops: z.string(),
    catalog: z.string().optional(),
    flags: z.string().optional(),
  }),
  kpis: z.object({
    tenants: z.number(),
    suspended: z.number(),
    webhookFailures: z.number(),
    failedDocuments: z.number(),
    failedSyncs: z.number(),
    quotaAlerts: z.number(),
    monthCostMicros: z.number(),
    monthTokens: z.number(),
  }),
  incidents: z.object({
    webhooks: z.array(incidentWebhookSchema),
    documents: z.array(incidentDocumentSchema),
    syncs: z.array(incidentSyncSchema),
    alerts: z.array(incidentAlertSchema),
  }),
});

export type KodivaModuleSnapshot = z.infer<typeof kodivaModuleSnapshotSchema>;

export type KodivaModuleClientResponse = {
  configured: boolean;
  hint?: string;
  error?: string;
  module: KodivaModuleSnapshot | null;
};
