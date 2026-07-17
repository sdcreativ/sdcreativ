import { withDb } from "@/lib/db";
import type { PortalPaymentStatus } from "@/lib/client-portal-payments";

export type ProjectPaymentMilestone = {
  id: string;
  projectId: string;
  label: string;
  amount: number;
  status: PortalPaymentStatus;
  dueDate: string | null;
  sortOrder: number;
};

export async function listProjectPaymentMilestones(
  projectId: string,
): Promise<ProjectPaymentMilestone[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      project_id: string;
      label: string;
      amount: number;
      status: PortalPaymentStatus;
      due_date: Date | null;
      sort_order: number;
    }>(
      `SELECT id, project_id, label, amount, status, due_date, sort_order
       FROM project_payment_milestones
       WHERE project_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [projectId],
    );
    return rows.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      label: r.label,
      amount: r.amount,
      status: r.status,
      dueDate: r.due_date?.toISOString().slice(0, 10) ?? null,
      sortOrder: r.sort_order,
    }));
  });
}

export type PaymentMilestoneInput = {
  id?: string;
  label: string;
  amount: number;
  status: PortalPaymentStatus;
  dueDate?: string | null;
};

export async function replaceProjectPaymentMilestones(
  projectId: string,
  items: PaymentMilestoneInput[],
): Promise<ProjectPaymentMilestone[]> {
  return withDb(async (query) => {
    await query(`DELETE FROM project_payment_milestones WHERE project_id = $1`, [projectId]);
    const serialized = items.map((item, i) => ({
      label: item.label,
      amount: item.amount,
      status: item.status,
      date: item.dueDate ?? null,
    }));
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      await query(
        `INSERT INTO project_payment_milestones
          (project_id, label, amount, status, due_date, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [projectId, item.label, item.amount, item.status, item.dueDate ?? null, i],
      );
    }
    // Mirror into metadata for portal consumers
    await query(
      `UPDATE projects
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('paymentSchedule', $2::jsonb),
           updated_at = NOW()
       WHERE id = $1`,
      [projectId, JSON.stringify(serialized)],
    );
    return listProjectPaymentMilestones(projectId);
  });
}
