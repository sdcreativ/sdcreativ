/**
 * Agrégats communication_events + cohorte leads 3CX (Phase 6 reporting).
 */

import { withDb, isDatabaseConfigured } from "@/lib/db";
import { resolvePeriod, type ReportsDateRange } from "@/lib/reports";
import type { ReportPeriod } from "@/content/reports-labels";
import type { CommunicationChannel } from "@/lib/threecx/journal";

export const THREE_CX_LEAD_SOURCES = ["live_chat_3cx", "call_3cx"] as const;

export type CommunicationsStatsFilters = {
  period?: ReportPeriod;
  channel?: CommunicationChannel | "all";
};

export type CommunicationsStats = {
  period: { from: string | null; to: string; label: string };
  channel: CommunicationChannel | "all";
  chats: {
    total: number;
    today: number;
    thisWeek: number;
  };
  calls: {
    total: number;
    inbound: number;
    outbound: number;
    internal: number;
    answered: number;
    missed: number;
    unknown: number;
    answerRate: number;
    missRate: number;
  };
  meetings: { total: number };
  avgDurationSec: number | null;
  leads: {
    from3cx: number;
    fromOther: number;
    liveChat3cx: number;
    call3cx: number;
  };
  conversion3cx: {
    leads: number;
    withQuote: number;
    signed: number;
    becameClient: number;
    quoteRate: number;
    clientRate: number;
  };
};

const MISSED_RE =
  /missed|no[-_\s]?answer|unanswered|abandoned|busy|failed|not[-_\s]?answered|manqu[ée]|sans[-_\s]?r[ée]ponse|d[ée]croch[ée]/i;
const ANSWERED_RE =
  /answered|completed|connected|success|ok|r[ée]pondu|abouti|terminé|termine/i;

/** Classifie une disposition 3CX (+ heuristique durée). */
export function classifyCallOutcome(
  disposition: string | null | undefined,
  durationSec: number | null | undefined,
  direction: string | null | undefined,
): "answered" | "missed" | "unknown" {
  const d = disposition?.trim() ?? "";
  if (d && MISSED_RE.test(d)) return "missed";
  if (d && ANSWERED_RE.test(d)) return "answered";
  if (durationSec != null && durationSec > 0) return "answered";
  if (
    (durationSec == null || durationSec === 0) &&
    (direction === "inbound" || !direction || direction === "unknown")
  ) {
    return "missed";
  }
  return "unknown";
}

function rate(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  from.setHours(0, 0, 0, 0);
  return from;
}

function emptyStats(
  range: ReportsDateRange,
  channel: CommunicationChannel | "all",
): CommunicationsStats {
  return {
    period: {
      from: range.from?.toISOString() ?? null,
      to: range.to.toISOString(),
      label: range.label,
    },
    channel,
    chats: { total: 0, today: 0, thisWeek: 0 },
    calls: {
      total: 0,
      inbound: 0,
      outbound: 0,
      internal: 0,
      answered: 0,
      missed: 0,
      unknown: 0,
      answerRate: 0,
      missRate: 0,
    },
    meetings: { total: 0 },
    avgDurationSec: null,
    leads: { from3cx: 0, fromOther: 0, liveChat3cx: 0, call3cx: 0 },
    conversion3cx: {
      leads: 0,
      withQuote: 0,
      signed: 0,
      becameClient: 0,
      quoteRate: 0,
      clientRate: 0,
    },
  };
}

export async function getCommunicationsStats(
  filters: CommunicationsStatsFilters = {},
): Promise<CommunicationsStats> {
  const period = filters.period ?? "month";
  const channel = filters.channel ?? "all";
  const range = resolvePeriod(period);

  if (!isDatabaseConfigured()) {
    return emptyStats(range, channel);
  }

  return withDb(async (query) => {
    const stats = emptyStats(range, channel);
    const eventTs = "COALESCE(e.started_at, e.created_at)";

    const periodParams: unknown[] = [];
    let periodClause = "";
    if (range.from) {
      periodParams.push(range.from, range.to);
      periodClause = ` AND ${eventTs} >= $1 AND ${eventTs} <= $2`;
    }

    let channelClause = "";
    const channelParams: unknown[] = [];
    if (channel !== "all") {
      channelParams.push(channel);
      const idx = periodParams.length + 1;
      channelClause = ` AND e.channel = $${idx}`;
    }

    const baseParams = [...periodParams, ...channelParams];

    const { rows: channelRows } = await query<{
      channel: string;
      cnt: string;
      dur_sum: string;
      dur_n: string;
    }>(
      `SELECT e.channel,
              COUNT(*)::text AS cnt,
              COALESCE(SUM(e.duration_sec), 0)::text AS dur_sum,
              COUNT(e.duration_sec)::text AS dur_n
       FROM communication_events e
       WHERE 1=1${periodClause}${channelClause}
       GROUP BY e.channel`,
      baseParams,
    );

    let durSum = 0;
    let durN = 0;
    for (const row of channelRows) {
      const count = Number(row.cnt);
      durSum += Number(row.dur_sum);
      durN += Number(row.dur_n);
      if (row.channel === "chat") stats.chats.total = count;
      else if (row.channel === "meeting") stats.meetings.total = count;
      else if (row.channel === "call") stats.calls.total = count;
    }
    stats.avgDurationSec = durN > 0 ? Math.round(durSum / durN) : null;

    if (channel === "all" || channel === "call") {
      const callParams = channel === "call" ? baseParams : [...periodParams];
      const callOnly =
        channel === "call" ? channelClause : ` AND e.channel = 'call'`;

      const { rows: dirRows } = await query<{ direction: string; cnt: string }>(
        `SELECT e.direction, COUNT(*)::text AS cnt
         FROM communication_events e
         WHERE 1=1${periodClause}${callOnly}
         GROUP BY e.direction`,
        callParams,
      );
      for (const row of dirRows) {
        const count = Number(row.cnt);
        if (row.direction === "inbound") stats.calls.inbound = count;
        else if (row.direction === "outbound") stats.calls.outbound = count;
        else if (row.direction === "internal") stats.calls.internal = count;
      }

      const { rows: outcomeRows } = await query<{
        disposition: string | null;
        has_duration: boolean;
        direction: string;
        cnt: string;
      }>(
        `SELECT e.disposition,
                (e.duration_sec IS NOT NULL AND e.duration_sec > 0) AS has_duration,
                e.direction,
                COUNT(*)::text AS cnt
         FROM communication_events e
         WHERE 1=1${periodClause}${callOnly}
         GROUP BY e.disposition, (e.duration_sec IS NOT NULL AND e.duration_sec > 0), e.direction`,
        callParams,
      );

      for (const row of outcomeRows) {
        const count = Number(row.cnt);
        const outcome = classifyCallOutcome(
          row.disposition,
          row.has_duration ? 1 : 0,
          row.direction,
        );
        if (outcome === "answered") stats.calls.answered += count;
        else if (outcome === "missed") stats.calls.missed += count;
        else stats.calls.unknown += count;
      }

      const decided = stats.calls.answered + stats.calls.missed;
      stats.calls.answerRate = rate(stats.calls.answered, decided);
      stats.calls.missRate = rate(stats.calls.missed, decided);
    }

    // Chats jour / semaine (fenêtres glissantes, indépendantes du filtre période)
    if (channel === "all" || channel === "chat") {
      const today = startOfToday();
      const weekStart = startOfWeekMonday();
      const now = new Date();

      const { rows: todayRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM communication_events e
         WHERE e.channel = 'chat'
           AND COALESCE(e.started_at, e.created_at) >= $1
           AND COALESCE(e.started_at, e.created_at) <= $2`,
        [today, now],
      );
      stats.chats.today = Number(todayRows[0]?.count ?? 0);

      const { rows: weekRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM communication_events e
         WHERE e.channel = 'chat'
           AND COALESCE(e.started_at, e.created_at) >= $1
           AND COALESCE(e.started_at, e.created_at) <= $2`,
        [weekStart, now],
      );
      stats.chats.thisWeek = Number(weekRows[0]?.count ?? 0);
    }

    // Leads 3CX vs autres (période sur created_at lead)
    const leadParams: unknown[] = [];
    let leadDate = "";
    if (range.from) {
      leadParams.push(range.from, range.to);
      leadDate = ` AND created_at >= $1 AND created_at <= $2`;
    }

    const { rows: sourceRows } = await query<{ source: string; count: string }>(
      `SELECT source, COUNT(*)::text AS count
       FROM leads
       WHERE 1=1${leadDate}
       GROUP BY source`,
      leadParams,
    );

    let from3cx = 0;
    let fromOther = 0;
    for (const row of sourceRows) {
      const n = Number(row.count);
      if (row.source === "live_chat_3cx") {
        stats.leads.liveChat3cx = n;
        from3cx += n;
      } else if (row.source === "call_3cx") {
        stats.leads.call3cx = n;
        from3cx += n;
      } else {
        fromOther += n;
      }
    }
    stats.leads.from3cx = from3cx;
    stats.leads.fromOther = fromOther;

    // Conversion cohorte sources 3CX
    const { rows: convRows } = await query<{
      total: string;
      with_quote: string;
      signed: string;
      became_client: string;
    }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (
                WHERE EXISTS (SELECT 1 FROM quotes q WHERE q.lead_id = l.id)
              )::text AS with_quote,
              COUNT(*) FILTER (WHERE l.status = 'signed')::text AS signed,
              COUNT(*) FILTER (
                WHERE EXISTS (SELECT 1 FROM clients c WHERE c.lead_id = l.id)
                   OR l.status = 'signed'
              )::text AS became_client
       FROM leads l
       WHERE l.source = ANY($1::text[])
         ${range.from ? "AND l.created_at >= $2 AND l.created_at <= $3" : ""}`,
      range.from
        ? [[...THREE_CX_LEAD_SOURCES], range.from, range.to]
        : [[...THREE_CX_LEAD_SOURCES]],
    );

    const convTotal = Number(convRows[0]?.total ?? 0);
    const withQuote = Number(convRows[0]?.with_quote ?? 0);
    const signed = Number(convRows[0]?.signed ?? 0);
    const becameClient = Number(convRows[0]?.became_client ?? 0);
    stats.conversion3cx = {
      leads: convTotal,
      withQuote,
      signed,
      becameClient,
      quoteRate: rate(withQuote, convTotal),
      clientRate: rate(becameClient, convTotal),
    };

    return stats;
  });
}

export function buildCommunicationsStatsCsv(stats: CommunicationsStats): string {
  const rows: Array<[string, string | number]> = [
    ["Période", stats.period.label],
    ["Canal filtre", stats.channel],
    ["Chats (période)", stats.chats.total],
    ["Chats aujourd'hui", stats.chats.today],
    ["Chats cette semaine", stats.chats.thisWeek],
    ["Appels total", stats.calls.total],
    ["Appels entrants", stats.calls.inbound],
    ["Appels sortants", stats.calls.outbound],
    ["Appels répondus", stats.calls.answered],
    ["Appels manqués", stats.calls.missed],
    ["Taux réponse %", stats.calls.answerRate],
    ["Taux manqués %", stats.calls.missRate],
    ["Réunions", stats.meetings.total],
    ["Durée moyenne (s)", stats.avgDurationSec ?? ""],
    ["Leads 3CX", stats.leads.from3cx],
    ["Leads autres sources", stats.leads.fromOther],
    ["Leads Live Chat 3CX", stats.leads.liveChat3cx],
    ["Leads Appel 3CX", stats.leads.call3cx],
    ["Cohorte 3CX — leads", stats.conversion3cx.leads],
    ["Cohorte 3CX — avec devis", stats.conversion3cx.withQuote],
    ["Cohorte 3CX — signés / clients", stats.conversion3cx.becameClient],
    ["Cohorte 3CX — taux devis %", stats.conversion3cx.quoteRate],
    ["Cohorte 3CX — taux client %", stats.conversion3cx.clientRate],
  ];
  return ["Indicateur,Valeur", ...rows.map(([k, v]) => `${csvCell(String(k))},${csvCell(String(v))}`)].join(
    "\n",
  );
}

function csvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
