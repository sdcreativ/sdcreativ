import { z } from "zod";
import { withDb } from "@/lib/db";
import { createInvoice, updateInvoice, type InvoiceLine } from "@/lib/invoices";
import { getClientById } from "@/lib/clients";
import type { SubscriptionInterval, SubscriptionStatus } from "@/content/subscriptions-labels";
import { SUBSCRIPTION_INTERVALS, SUBSCRIPTION_STATUSES } from "@/content/subscriptions-labels";

export type Subscription = {
  id: string;
  clientId: string;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  contractId: string | null;
  title: string;
  amount: number;
  interval: SubscriptionInterval;
  status: SubscriptionStatus;
  nextBillingDate: string;
  renewalReminderDays: number;
  tvaRate: number;
  lines: InvoiceLine[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionRow = {
  id: string;
  client_id: string;
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
  contract_id: string | null;
  title: string;
  amount: number;
  interval: SubscriptionInterval;
  status: SubscriptionStatus;
  next_billing_date: Date;
  renewal_reminder_days: number;
  tva_rate: string | number;
  lines: InvoiceLine[] | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
};

const select = `
  SELECT s.*, c.name AS client_name, p.name AS project_name
  FROM crm_subscriptions s
  LEFT JOIN clients c ON c.id = s.client_id
  LEFT JOIN projects p ON p.id = s.project_id
`;

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    projectId: row.project_id,
    projectName: row.project_name,
    contractId: row.contract_id,
    title: row.title,
    amount: row.amount,
    interval: row.interval,
    status: row.status,
    nextBillingDate: row.next_billing_date.toISOString().slice(0, 10),
    renewalReminderDays: row.renewal_reminder_days,
    tvaRate: Number(row.tva_rate),
    lines: row.lines ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function advanceBillingDate(date: string, interval: SubscriptionInterval): string {
  const d = new Date(`${date}T12:00:00`);
  if (interval === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

const lineSchema = z.object({
  label: z.string().trim().min(1).max(200),
  amount: z.number().int().min(0),
});

export const createSubscriptionSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  contractId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  amount: z.number().int().positive(),
  interval: z.enum(SUBSCRIPTION_INTERVALS).optional(),
  nextBillingDate: z.string(),
  renewalReminderDays: z.number().int().min(1).max(90).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  lines: z.array(lineSchema).optional(),
});

export const updateSubscriptionSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  amount: z.number().int().positive().optional(),
  interval: z.enum(SUBSCRIPTION_INTERVALS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  nextBillingDate: z.string().optional(),
  renewalReminderDays: z.number().int().min(1).max(90).optional(),
  tvaRate: z.number().min(0).max(100).optional(),
  lines: z.array(lineSchema).optional(),
});

export async function listSubscriptions(filters?: {
  clientId?: string;
  status?: SubscriptionStatus;
}): Promise<Subscription[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.clientId) {
      params.push(filters.clientId);
      clauses.push(`s.client_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      clauses.push(`s.status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<SubscriptionRow>(
      `${select} ${where} ORDER BY s.next_billing_date ASC`,
      params,
    );
    return rows.map(mapSubscription);
  });
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  return withDb(async (query) => {
    const { rows } = await query<SubscriptionRow>(`${select} WHERE s.id = $1`, [id]);
    return rows[0] ? mapSubscription(rows[0]) : null;
  });
}

export async function createSubscription(
  input: z.infer<typeof createSubscriptionSchema>,
): Promise<Subscription> {
  return withDb(async (query) => {
    const lines = input.lines?.length
      ? input.lines
      : [{ label: input.title, amount: input.amount }];
    const { rows } = await query<SubscriptionRow>(
      `INSERT INTO crm_subscriptions (
        client_id, project_id, contract_id, title, amount, interval,
        next_billing_date, renewal_reminder_days, tva_rate, lines
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        input.clientId,
        input.projectId ?? null,
        input.contractId ?? null,
        input.title,
        input.amount,
        input.interval ?? "monthly",
        input.nextBillingDate,
        input.renewalReminderDays ?? 14,
        input.tvaRate ?? 18,
        JSON.stringify(lines),
      ],
    );
    const { rows: full } = await query<SubscriptionRow>(`${select} WHERE s.id = $1`, [rows[0]!.id]);
    return mapSubscription(full[0]!);
  });
}

export async function updateSubscription(
  id: string,
  input: z.infer<typeof updateSubscriptionSchema>,
): Promise<Subscription | null> {
  return withDb(async (query) => {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      params.push(input.title);
      sets.push(`title = $${params.length}`);
    }
    if (input.amount !== undefined) {
      params.push(input.amount);
      sets.push(`amount = $${params.length}`);
    }
    if (input.interval !== undefined) {
      params.push(input.interval);
      sets.push(`interval = $${params.length}`);
    }
    if (input.status !== undefined) {
      params.push(input.status);
      sets.push(`status = $${params.length}`);
    }
    if (input.nextBillingDate !== undefined) {
      params.push(input.nextBillingDate);
      sets.push(`next_billing_date = $${params.length}`);
    }
    if (input.renewalReminderDays !== undefined) {
      params.push(input.renewalReminderDays);
      sets.push(`renewal_reminder_days = $${params.length}`);
    }
    if (input.tvaRate !== undefined) {
      params.push(input.tvaRate);
      sets.push(`tva_rate = $${params.length}`);
    }
    if (input.lines !== undefined) {
      params.push(JSON.stringify(input.lines));
      sets.push(`lines = $${params.length}`);
    }

    if (sets.length === 0) return getSubscriptionById(id);

    params.push(id);
    await query(
      `UPDATE crm_subscriptions SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params,
    );
    return getSubscriptionById(id);
  });
}

export type SubscriptionBillingResult = {
  processed: number;
  invoicesCreated: string[];
  renewalAlerts: number;
};

export async function processSubscriptionBilling(
  now = new Date(),
): Promise<SubscriptionBillingResult> {
  const today = now.toISOString().slice(0, 10);
  const subscriptions = await listSubscriptions({ status: "active" });
  const due = subscriptions.filter((s) => s.nextBillingDate <= today);
  const invoicesCreated: string[] = [];
  let renewalAlerts = 0;

  for (const sub of due) {
    const client = await getClientById(sub.clientId);
    if (!client) continue;

    const invoice = await createInvoice({
      clientId: sub.clientId,
      projectId: sub.projectId,
      name: client.name,
      email: client.email,
      company: client.company,
      lines: sub.lines.length ? sub.lines : [{ label: sub.title, amount: sub.amount }],
      tvaRate: sub.tvaRate,
      status: "sent",
      dueDate: today,
      notes: `Facture récurrente — ${sub.title}`,
    });
    await updateInvoice(invoice.id, {
      metadata: { subscriptionId: sub.id, recurring: true },
    });
    invoicesCreated.push(invoice.reference);

    await updateSubscription(sub.id, {
      nextBillingDate: advanceBillingDate(sub.nextBillingDate, sub.interval),
    });
  }

  for (const sub of subscriptions) {
    const daysUntil = Math.ceil(
      (new Date(`${sub.nextBillingDate}T12:00:00`).getTime() - now.getTime()) / 86_400_000,
    );
    if (daysUntil > 0 && daysUntil <= sub.renewalReminderDays) {
      renewalAlerts += 1;
    }
  }

  return { processed: due.length, invoicesCreated, renewalAlerts };
}
