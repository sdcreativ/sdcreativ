import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import type { PurchaseOrderStatus } from "@/content/priority3-labels";
import { PO_STATUSES } from "@/content/priority3-labels";
import type { SupportedCurrency } from "@/lib/currencies";

export type Vendor = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialty: string | null;
  hourlyRate: number | null;
  currency: SupportedCurrency;
  notes: string | null;
  createdAt: string;
};

export type VendorPurchaseOrder = {
  id: string;
  reference: string;
  vendorId: string;
  vendorName: string | null;
  projectId: string | null;
  projectName: string | null;
  amount: number;
  currency: SupportedCurrency;
  status: PurchaseOrderStatus;
  dueDate: string | null;
  description: string | null;
  createdAt: string;
};

async function nextPoReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM vendor_purchase_orders WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `PO-${year}-${seq}`;
}

export const createVendorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  specialty: z.string().trim().max(120).optional().nullable(),
  hourlyRate: z.number().int().min(0).optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  amount: z.number().int().positive(),
  currency: z.string().length(3).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function listVendors(): Promise<Vendor[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      specialty: string | null;
      hourly_rate: number | null;
      currency: string;
      notes: string | null;
      created_at: Date;
    }>(`SELECT * FROM crm_vendors ORDER BY name ASC`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      specialty: r.specialty,
      hourlyRate: r.hourly_rate,
      currency: r.currency as SupportedCurrency,
      notes: r.notes,
      createdAt: r.created_at.toISOString(),
    }));
  });
}

export async function createVendor(input: z.infer<typeof createVendorSchema>): Promise<Vendor> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO crm_vendors (name, email, phone, specialty, hourly_rate, currency, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        input.name,
        input.email ?? null,
        input.phone ?? null,
        input.specialty ?? null,
        input.hourlyRate ?? null,
        input.currency ?? "XOF",
        input.notes ?? null,
      ],
    );
    const list = await listVendors();
    return list.find((v) => v.id === rows[0]!.id)!;
  });
}

export async function listPurchaseOrders(filters?: {
  projectId?: string;
}): Promise<VendorPurchaseOrder[]> {
  return withDb(async (query) => {
    const params: unknown[] = [];
    let where = "";
    if (filters?.projectId) {
      params.push(filters.projectId);
      where = `WHERE po.project_id = $1`;
    }
    const { rows } = await query<{
      id: string;
      reference: string;
      vendor_id: string;
      vendor_name: string | null;
      project_id: string | null;
      project_name: string | null;
      amount: number;
      currency: string;
      status: PurchaseOrderStatus;
      due_date: Date | null;
      description: string | null;
      created_at: Date;
    }>(
      `SELECT po.*, v.name AS vendor_name, p.name AS project_name
       FROM vendor_purchase_orders po
       LEFT JOIN crm_vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       ${where}
       ORDER BY po.created_at DESC`,
      params,
    );
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      projectId: r.project_id,
      projectName: r.project_name,
      amount: r.amount,
      currency: r.currency as SupportedCurrency,
      status: r.status,
      dueDate: r.due_date?.toISOString().slice(0, 10) ?? null,
      description: r.description,
      createdAt: r.created_at.toISOString(),
    }));
  });
}

export async function createPurchaseOrder(
  input: z.infer<typeof createPurchaseOrderSchema>,
): Promise<VendorPurchaseOrder> {
  return withDb(async (query) => {
    const reference = await nextPoReference(query);
    const { rows } = await query<{ id: string }>(
      `INSERT INTO vendor_purchase_orders (reference, vendor_id, project_id, amount, currency, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        reference,
        input.vendorId,
        input.projectId ?? null,
        input.amount,
        input.currency ?? "XOF",
        input.description ?? null,
        input.dueDate ?? null,
      ],
    );
    const list = await listPurchaseOrders();
    return list.find((p) => p.id === rows[0]!.id)!;
  });
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
): Promise<void> {
  if (!PO_STATUSES.includes(status)) return;
  await withDb(async (query) => {
    await query(
      `UPDATE vendor_purchase_orders SET status = $2, updated_at = NOW() WHERE id = $1`,
      [id, status],
    );
  });
}

export async function getProjectVendorMargin(projectId: string): Promise<{
  budget: number | null;
  vendorCosts: number;
  margin: number | null;
}> {
  return withDb(async (query) => {
    const { rows: proj } = await query<{ budget: number | null }>(
      `SELECT budget FROM projects WHERE id = $1`,
      [projectId],
    );
    const { rows: costs } = await query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM vendor_purchase_orders
       WHERE project_id = $1 AND status NOT IN ('cancelled')`,
      [projectId],
    );
    const budget = proj[0]?.budget ?? null;
    const vendorCosts = Number(costs[0]?.total ?? 0);
    const margin = budget != null ? budget - vendorCosts : null;
    return { budget, vendorCosts, margin };
  });
}
