import { z } from "zod";
import { withDb } from "@/lib/db";
import {
  DEFAULT_OPERATIONS_SETTINGS,
  type OperationsSettings,
  type ScheduledReportConfig,
} from "@/lib/operations-settings-types";
import { REPORT_FREQUENCIES, REPORT_KPI_KEYS } from "@/lib/operations-settings-types";

const scheduledReportSchema = z.object({
  id: z.string().uuid().optional(),
  enabled: z.boolean(),
  label: z.string().trim().min(1).max(120),
  recipients: z.array(z.string().email()).min(1),
  frequency: z.enum(REPORT_FREQUENCIES),
  kpis: z.array(z.enum(REPORT_KPI_KEYS)).min(1),
  includeComparison: z.boolean(),
  includeCsv: z.boolean(),
  lastSentAt: z.string().nullable().optional(),
});

export const updateOperationsSettingsSchema = z.object({
  scheduledReports: z.array(scheduledReportSchema),
});

export function mergeOperationsSettings(
  stored: Partial<OperationsSettings> | null | undefined,
): OperationsSettings {
  return {
    scheduledReports: stored?.scheduledReports ?? DEFAULT_OPERATIONS_SETTINGS.scheduledReports,
  };
}

export async function getOperationsSettings(): Promise<OperationsSettings> {
  return withDb(async (query) => {
    const { rows } = await query<{ operations: OperationsSettings | null }>(
      `SELECT operations FROM crm_settings WHERE id = 1`,
    );
    return mergeOperationsSettings(rows[0]?.operations);
  });
}

export async function updateOperationsSettings(
  input: z.infer<typeof updateOperationsSettingsSchema>,
): Promise<OperationsSettings> {
  return withDb(async (query) => {
    const existing = await getOperationsSettings();
    const scheduledReports: ScheduledReportConfig[] = input.scheduledReports.map((r) => ({
      id: r.id ?? crypto.randomUUID(),
      enabled: r.enabled,
      label: r.label,
      recipients: r.recipients,
      frequency: r.frequency,
      kpis: r.kpis,
      includeComparison: r.includeComparison,
      includeCsv: r.includeCsv,
      lastSentAt:
        r.lastSentAt ??
        existing.scheduledReports.find((e) => e.id === r.id)?.lastSentAt ??
        null,
    }));

    const operations: OperationsSettings = { scheduledReports };

    await query(
      `INSERT INTO crm_settings (id, operations, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET operations = $1, updated_at = NOW()`,
      [JSON.stringify(operations)],
    );

    return operations;
  });
}

export async function markScheduledReportSent(reportId: string): Promise<void> {
  const settings = await getOperationsSettings();
  const updated: OperationsSettings = {
    scheduledReports: settings.scheduledReports.map((r) =>
      r.id === reportId ? { ...r, lastSentAt: new Date().toISOString() } : r,
    ),
  };
  await withDb(async (query) => {
    await query(
      `INSERT INTO crm_settings (id, operations, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET operations = $1, updated_at = NOW()`,
      [JSON.stringify(updated)],
    );
  });
}

export function shouldSendScheduledReport(
  report: ScheduledReportConfig,
  now = new Date(),
): boolean {
  if (!report.enabled || report.recipients.length === 0) return false;

  const last = report.lastSentAt ? new Date(report.lastSentAt) : null;
  const day = now.getDate();
  const weekday = now.getDay();

  if (report.frequency === "weekly") {
    if (weekday !== 1) return false;
    if (last && now.getTime() - last.getTime() < 6 * 86_400_000) return false;
    return true;
  }

  if (report.frequency === "monthly") {
    if (day !== 1) return false;
    if (last && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()) {
      return false;
    }
    return true;
  }

  if (report.frequency === "quarterly") {
    const quarterMonths = [0, 3, 6, 9];
    if (!quarterMonths.includes(now.getMonth()) || day !== 1) return false;
    if (last && now.getTime() - last.getTime() < 80 * 86_400_000) return false;
    return true;
  }

  return false;
}
