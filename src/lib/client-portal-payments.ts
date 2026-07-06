import type { Project } from "@/lib/projects";
import type { Client } from "@/lib/clients";
import { formatProjectDate } from "@/content/projects-labels";

export type PortalPaymentStatus = "paid" | "pending" | "overdue";

export type PaymentScheduleDraftItem = {
  id: string;
  label: string;
  amount: string;
  status: PortalPaymentStatus;
  date: string;
};

export const PAYMENT_STATUS_LABELS: Record<PortalPaymentStatus, string> = {
  paid: "Payé",
  pending: "À venir",
  overdue: "En retard",
};

export type PortalPaymentScheduleItem = {
  id: string;
  label: string;
  amount: number;
  status: PortalPaymentStatus;
  date: string;
};

export type PortalPaymentsPayload = {
  linkedToCrm: boolean;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  paidPercent: number;
  schedule: PortalPaymentScheduleItem[];
};

type RawScheduleItem = {
  label?: string;
  amount?: number;
  status?: string;
  date?: string;
  paidAt?: string;
  dueDate?: string;
};

function readAmount(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return undefined;
}

function normalizePaymentStatus(raw: string | undefined): PortalPaymentStatus {
  if (raw === "paid" || raw === "payé") return "paid";
  if (raw === "overdue" || raw === "retard") return "overdue";
  return "pending";
}

function parseScheduleFromMetadata(
  raw: unknown,
  fallbackEndDate: string,
): PortalPaymentScheduleItem[] | null {
  if (!Array.isArray(raw)) return null;

  const items: PortalPaymentScheduleItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const entry = raw[i] as RawScheduleItem;
    const label = entry.label?.trim();
    const amount = readAmount(entry.amount);
    if (!label || amount == null) continue;

    items.push({
      id: `schedule-${i}`,
      label,
      amount,
      status: normalizePaymentStatus(entry.status),
      date: entry.date ?? entry.paidAt ?? entry.dueDate ?? "—",
    });
  }

  return items.length > 0 ? items : null;
}

export function paidAmountFromScheduleDraft(items: PaymentScheduleDraftItem[]): number {
  return items.reduce((sum, item) => {
    if (item.status !== "paid") return sum;
    const amount = readAmount(item.amount);
    return sum + (amount ?? 0);
  }, 0);
}

export function serializePaymentScheduleDraft(
  items: PaymentScheduleDraftItem[],
): Array<{ label: string; amount: number; status: PortalPaymentStatus; date: string }> {
  return items
    .map((item) => {
      const label = item.label.trim();
      const amount = readAmount(item.amount);
      if (!label || amount == null) return null;
      return {
        label,
        amount,
        status: item.status,
        date: item.date.trim() || "—",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function createDefaultScheduleDraft(input: {
  budget: number | null;
  dueDate: string | null;
  paidAmount?: number;
}): PaymentScheduleDraftItem[] {
  const budget = input.budget ?? 0;
  const endDate = dueDateLabel(input.dueDate);
  const paid = input.paidAmount ?? 0;
  const remaining = Math.max(0, budget - paid);
  const uid = () => `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (paid <= 0) {
    const half = Math.round(budget * 0.5);
    return [
      { id: uid(), label: "Acompte à la signature", amount: String(half), status: "pending", date: "À planifier" },
      { id: uid(), label: "Solde à la livraison", amount: String(budget - half), status: "pending", date: endDate },
    ];
  }

  return [
    { id: uid(), label: "Acompte à la signature", amount: String(paid), status: "paid", date: "Enregistré" },
    {
      id: uid(),
      label: "Solde à la livraison",
      amount: String(remaining),
      status: remaining > 0 ? "pending" : "paid",
      date: endDate,
    },
  ];
}

function dueDateLabel(iso: string | null): string {
  if (!iso) return "À planifier";
  return formatProjectDate(iso);
}

export function paymentScheduleDraftFromMetadata(
  raw: unknown,
  fallback?: { budget?: number | null; dueDate?: string | null; paidAmount?: number },
): PaymentScheduleDraftItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createDefaultScheduleDraft({
      budget: fallback?.budget ?? null,
      dueDate: fallback?.dueDate ?? null,
      paidAmount: fallback?.paidAmount,
    });
  }

  return raw.map((entry, index) => {
    const item = entry as RawScheduleItem;
    return {
      id: `draft-${index}`,
      label: item.label?.trim() ?? "",
      amount: item.amount != null ? String(item.amount) : "",
      status: normalizePaymentStatus(item.status),
      date: item.date ?? item.paidAt ?? item.dueDate ?? "",
    };
  });
}

function defaultSchedule(
  totalAmount: number,
  paidAmount: number,
  endDate: string,
): PortalPaymentScheduleItem[] {
  const remaining = Math.max(0, totalAmount - paidAmount);

  if (paidAmount <= 0) {
    return [
      {
        id: "default-1",
        label: "Acompte à la signature",
        amount: Math.round(totalAmount * 0.5),
        status: "pending",
        date: "À planifier",
      },
      {
        id: "default-2",
        label: "Solde à la livraison",
        amount: totalAmount - Math.round(totalAmount * 0.5),
        status: "pending",
        date: endDate,
      },
    ];
  }

  return [
    {
      id: "default-paid",
      label: "Acompte à la signature",
      amount: paidAmount,
      status: "paid",
      date: "Enregistré",
    },
    {
      id: "default-balance",
      label: "Solde à la livraison",
      amount: remaining,
      status: remaining > 0 ? "pending" : "paid",
      date: endDate,
    },
  ];
}

export function buildPortalPaymentsPayload(input: {
  client: Client | null;
  project: Project | null;
  fallbackTotal: number;
  fallbackPaid: number;
  fallbackEndDate: string;
}): PortalPaymentsPayload {
  const { client, project } = input;

  const totalAmount =
    project?.budget ??
    readAmount(project?.metadata?.totalAmount) ??
    readAmount(client?.metadata?.totalAmount) ??
    input.fallbackTotal;

  const paidAmount = Math.min(
    totalAmount,
    readAmount(client?.metadata?.paidAmount) ??
      readAmount(project?.metadata?.paidAmount) ??
      input.fallbackPaid,
  );

  const endDate = project?.dueDate
    ? formatProjectDate(project.dueDate)
    : input.fallbackEndDate;

  const scheduleFromMeta =
    parseScheduleFromMetadata(project?.metadata?.paymentSchedule, endDate) ??
    parseScheduleFromMetadata(client?.metadata?.paymentSchedule, endDate);

  const schedule = scheduleFromMeta ?? defaultSchedule(totalAmount, paidAmount, endDate);
  const remaining = Math.max(0, totalAmount - paidAmount);
  const paidPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  return {
    linkedToCrm: Boolean(client),
    totalAmount,
    paidAmount,
    remaining,
    paidPercent,
    schedule,
  };
}
