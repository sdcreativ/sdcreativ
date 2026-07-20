import { withDb } from "@/lib/db";

export type ClientHealthFactor = {
  id: string;
  label: string;
  score: number;
  max: number;
  detail: string;
};

export type ClientHealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "E";
  label: string;
  factors: ClientHealthFactor[];
};

function gradeFromScore(score: number): ClientHealthScore["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

function labelFromGrade(grade: ClientHealthScore["grade"]): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Sain";
    case "C":
      return "À surveiller";
    case "D":
      return "Fragile";
    default:
      return "Critique";
  }
}

/** Score 0–100 à partir des signaux tickets / factures / activité. */
export function computeClientHealthScore(input: {
  openTickets: number;
  slaBreached: number;
  overdueInvoices: number;
  unpaidAmount: number;
  daysSinceLastComm: number | null;
  mailThreads30d: number;
  calls30d: number;
}): ClientHealthScore {
  const factors: ClientHealthFactor[] = [];

  // SLA / tickets (25)
  let ticketScore = 25;
  if (input.slaBreached > 0) ticketScore -= Math.min(25, input.slaBreached * 12);
  else if (input.openTickets >= 5) ticketScore -= 10;
  else if (input.openTickets >= 2) ticketScore -= 5;
  factors.push({
    id: "tickets",
    label: "Tickets & SLA",
    score: Math.max(0, ticketScore),
    max: 25,
    detail:
      input.slaBreached > 0
        ? `${input.slaBreached} SLA dépassé(s), ${input.openTickets} ouvert(s)`
        : `${input.openTickets} ticket(s) ouvert(s)`,
  });

  // Impayés (30)
  let unpaidScore = 30;
  if (input.overdueInvoices > 0) unpaidScore -= Math.min(30, input.overdueInvoices * 10);
  if (input.unpaidAmount > 500_000) unpaidScore -= 8;
  else if (input.unpaidAmount > 100_000) unpaidScore -= 4;
  factors.push({
    id: "billing",
    label: "Facturation",
    score: Math.max(0, unpaidScore),
    max: 30,
    detail:
      input.overdueInvoices > 0
        ? `${input.overdueInvoices} impayée(s) · ${input.unpaidAmount.toLocaleString("fr-FR")} dû`
        : input.unpaidAmount > 0
          ? `${input.unpaidAmount.toLocaleString("fr-FR")} en cours`
          : "Aucune impayée",
  });

  // Activité relationnelle (25)
  let activityScore = 25;
  if (input.daysSinceLastComm == null) activityScore -= 15;
  else if (input.daysSinceLastComm > 60) activityScore -= 15;
  else if (input.daysSinceLastComm > 30) activityScore -= 8;
  else if (input.daysSinceLastComm > 14) activityScore -= 3;
  factors.push({
    id: "activity",
    label: "Dernière activité",
    score: Math.max(0, activityScore),
    max: 25,
    detail:
      input.daysSinceLastComm == null
        ? "Aucune activité connue"
        : `Il y a ${input.daysSinceLastComm} j`,
  });

  // Canaux mail / 3CX (20)
  const touchpoints = input.mailThreads30d + input.calls30d;
  let channelScore = 5;
  if (touchpoints >= 5) channelScore = 20;
  else if (touchpoints >= 2) channelScore = 14;
  else if (touchpoints >= 1) channelScore = 10;
  factors.push({
    id: "channels",
    label: "Mail & 3CX (30 j)",
    score: channelScore,
    max: 20,
    detail: `${input.mailThreads30d} fil(s) mail · ${input.calls30d} appel(s)/chat`,
  });

  const score = factors.reduce((sum, f) => sum + f.score, 0);
  const grade = gradeFromScore(score);
  return {
    score,
    grade,
    label: labelFromGrade(grade),
    factors,
  };
}

export async function getClientHealthScore(clientId: string): Promise<ClientHealthScore> {
  return withDb(async (query) => {
    const { rows: ticketRows } = await query<{ open: string; breached: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'cancelled'))::text AS open,
         COUNT(*) FILTER (
           WHERE sla_due_at < NOW() AND status NOT IN ('resolved', 'closed', 'cancelled')
         )::text AS breached
       FROM support_tickets WHERE client_id = $1`,
      [clientId],
    );

    const { rows: invoiceRows } = await query<{ overdue: string; unpaid: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'overdue')::text AS overdue,
         COALESCE(SUM(total - paid_amount) FILTER (
           WHERE status IN ('sent', 'overdue') AND total > paid_amount
         ), 0)::text AS unpaid
       FROM invoices WHERE client_id = $1 AND archived_at IS NULL`,
      [clientId],
    );

    const { rows: commRows } = await query<{ last_at: Date | null; calls: string }>(
      `SELECT MAX(COALESCE(started_at, created_at)) AS last_at,
              COUNT(*) FILTER (
                WHERE COALESCE(started_at, created_at) > NOW() - INTERVAL '30 days'
              )::text AS calls
       FROM communication_events WHERE client_id = $1`,
      [clientId],
    );

    let mailThreads30d = 0;
    try {
      const { rows: mailRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM crm_mail_threads
         WHERE client_id = $1 AND updated_at > NOW() - INTERVAL '30 days'`,
        [clientId],
      );
      mailThreads30d = Number(mailRows[0]?.count ?? 0);
    } catch {
      mailThreads30d = 0;
    }

    const lastAt = commRows[0]?.last_at ?? null;
    const daysSinceLastComm = lastAt
      ? Math.floor((Date.now() - lastAt.getTime()) / 86_400_000)
      : null;

    return computeClientHealthScore({
      openTickets: Number(ticketRows[0]?.open ?? 0),
      slaBreached: Number(ticketRows[0]?.breached ?? 0),
      overdueInvoices: Number(invoiceRows[0]?.overdue ?? 0),
      unpaidAmount: Number(invoiceRows[0]?.unpaid ?? 0),
      daysSinceLastComm,
      mailThreads30d,
      calls30d: Number(commRows[0]?.calls ?? 0),
    });
  });
}
