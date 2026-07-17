import { withDb } from "@/lib/db";

export type CommercialWorkloadRow = {
  userId: string;
  name: string;
  email: string;
  openLeads: number;
  openQuotes: number;
  pipelineAmount: number;
  openDeals: number;
  openTasks: number;
  overdueTasks: number;
  followUpsDue: number;
};

export type WorkloadSnapshot = {
  rows: CommercialWorkloadRow[];
  totals: Omit<CommercialWorkloadRow, "userId" | "name" | "email">;
};

/**
 * Charge commerciale par utilisateur CRM actif :
 * leads ouverts, devis en négociation, CA pipeline, tâches, relances.
 */
export async function getCommercialWorkload(): Promise<WorkloadSnapshot> {
  return withDb(async (query) => {
    const { rows } = await query<{
      user_id: string;
      name: string;
      email: string;
      open_leads: string;
      open_quotes: string;
      pipeline_amount: string;
      open_deals: string;
      open_tasks: string;
      overdue_tasks: string;
      follow_ups_due: string;
    }>(
      `SELECT
         u.id AS user_id,
         u.name,
         u.email,
         COUNT(DISTINCT l.id) FILTER (
           WHERE l.status NOT IN ('lost', 'signed')
         )::text AS open_leads,
         COUNT(DISTINCT q.id) FILTER (
           WHERE q.status IN ('sent', 'viewed', 'follow_up', 'negotiation', 'signed')
         )::text AS open_quotes,
         COALESCE(SUM(q.subtotal) FILTER (
           WHERE q.status IN ('sent', 'viewed', 'follow_up', 'negotiation', 'signed')
         ), 0)::text AS pipeline_amount,
         COUNT(DISTINCT CASE
           WHEN l.status NOT IN ('lost')
            AND (
              EXISTS (
                SELECT 1 FROM quotes qx
                WHERE qx.lead_id = l.id
                  AND qx.status NOT IN ('rejected', 'expired', 'invoiced')
              )
              OR l.status IN ('new', 'contacted', 'quote_sent', 'signed')
            )
           THEN l.id END
         )::text AS open_deals,
         COUNT(DISTINCT t.id) FILTER (WHERE t.status <> 'done')::text AS open_tasks,
         COUNT(DISTINCT t.id) FILTER (
           WHERE t.status <> 'done' AND t.due_date < CURRENT_DATE
         )::text AS overdue_tasks,
         COUNT(DISTINCT q2.id) FILTER (
           WHERE q2.status IN ('sent', 'viewed', 'follow_up')
             AND q2.follow_up_at IS NOT NULL
             AND q2.follow_up_at::date <= CURRENT_DATE
         )::text AS follow_ups_due
       FROM crm_users u
       LEFT JOIN leads l ON l.assignee_id = u.id
       LEFT JOIN quotes q ON q.lead_id = l.id
       LEFT JOIN tasks t ON t.assignee_id = u.id
       LEFT JOIN quotes q2 ON q2.lead_id = l.id
       WHERE u.active = true
       GROUP BY u.id, u.name, u.email
       HAVING
         COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('lost', 'signed')) > 0
         OR COUNT(DISTINCT q.id) FILTER (
           WHERE q.status IN ('sent', 'viewed', 'follow_up', 'negotiation', 'signed')
         ) > 0
         OR COUNT(DISTINCT t.id) FILTER (WHERE t.status <> 'done') > 0
       ORDER BY
         COALESCE(SUM(q.subtotal) FILTER (
           WHERE q.status IN ('sent', 'viewed', 'follow_up', 'negotiation', 'signed')
         ), 0) DESC,
         u.name ASC`,
    );

    const mapped: CommercialWorkloadRow[] = rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      openLeads: Number(r.open_leads),
      openQuotes: Number(r.open_quotes),
      pipelineAmount: Number(r.pipeline_amount),
      openDeals: Number(r.open_deals),
      openTasks: Number(r.open_tasks),
      overdueTasks: Number(r.overdue_tasks),
      followUpsDue: Number(r.follow_ups_due),
    }));

    const totals = mapped.reduce(
      (acc, row) => ({
        openLeads: acc.openLeads + row.openLeads,
        openQuotes: acc.openQuotes + row.openQuotes,
        pipelineAmount: acc.pipelineAmount + row.pipelineAmount,
        openDeals: acc.openDeals + row.openDeals,
        openTasks: acc.openTasks + row.openTasks,
        overdueTasks: acc.overdueTasks + row.overdueTasks,
        followUpsDue: acc.followUpsDue + row.followUpsDue,
      }),
      {
        openLeads: 0,
        openQuotes: 0,
        pipelineAmount: 0,
        openDeals: 0,
        openTasks: 0,
        overdueTasks: 0,
        followUpsDue: 0,
      },
    );

    return { rows: mapped, totals };
  });
}
