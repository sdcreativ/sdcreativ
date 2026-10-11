import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { ACQUISITION_CHANNELS, type AcquisitionChannel } from "@/lib/attribution";

/** Compteurs anonymes de visites et de clics WhatsApp par canal / campagne (sans IP ni identifiant). */
export const marketingEventSchema = z.object({
  kind: z.enum(["visit", "whatsapp_click"]),
  channel: z.enum(ACQUISITION_CHANNELS),
  campaign: z.string().trim().max(120).optional(),
  path: z.string().trim().max(300).optional(),
  cta: z.string().trim().max(60).optional(),
});
export type MarketingEvent = z.infer<typeof marketingEventSchema>;

/** Robots d'indexation et outils d'aperçu : ne comptent pas comme visites. */
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp\/|curl|wget|python/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  return !ua || BOT_UA.test(ua);
}

export async function recordMarketingEvent(event: MarketingEvent): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await withDb((query) =>
    query(
      `INSERT INTO marketing_events (kind, channel, campaign, path, cta) VALUES ($1, $2, $3, $4, $5)`,
      [event.kind, event.channel, event.campaign || null, event.path || null, event.cta || null],
    ),
  );
}

export const ACQUISITION_PERIODS = [30, 90, 365] as const;
export type AcquisitionPeriod = (typeof ACQUISITION_PERIODS)[number];

export type AcquisitionRow = {
  /** Canal, ou null pour un prospect / devis dont l'origine n'est pas renseignée. */
  channel: AcquisitionChannel | null;
  campaign: string | null;
  visits: number;
  whatsappClicks: number;
  leads: number;
  quotes: number;
  quotesSigned: number;
  /** Montant HT des devis signés, converti en FCFA. */
  signedAmountXof: number;
};

export type AcquisitionReport = {
  days: AcquisitionPeriod;
  channels: AcquisitionRow[];
  campaigns: AcquisitionRow[];
};

/** Signés = signé, validé, accepté ou facturé (comme le suivi des popups). */
const SIGNED_QUOTE_STATUSES = ["signed", "validated", "accepted", "invoiced"];

type ReportRow = {
  channel: string | null;
  campaign: string | null;
  visits: number;
  whatsapp_clicks: number;
  leads: number;
  quotes: number;
  quotes_signed: number;
  signed_amount_xof: string | null;
};

/**
 * De la visite au chiffre d'affaires, par canal puis par campagne, sur la période :
 * visites et clics WhatsApp (compteurs anonymes), prospects créés, devis créés et devis signés
 * rattachés à ces prospects (origine du prospect lié au devis).
 */
export async function getAcquisitionReport(days: AcquisitionPeriod): Promise<AcquisitionReport> {
  if (!isDatabaseConfigured()) return { days, channels: [], campaigns: [] };
  const sql = (key: "channel" | "campaign") => {
    const leadKey =
      key === "channel"
        ? "l.acquisition_channel"
        : "COALESCE(l.attribution->'last'->>'campaign', l.attribution->'first'->>'campaign')";
    const eventKey = key === "channel" ? "e.channel" : "e.campaign";
    const keyFilter = key === "campaign" ? "WHERE k IS NOT NULL" : "";
    return `WITH ev AS (
         SELECT ${eventKey} AS k,
           COUNT(*) FILTER (WHERE e.kind = 'visit')::int AS visits,
           COUNT(*) FILTER (WHERE e.kind = 'whatsapp_click')::int AS whatsapp_clicks
         FROM marketing_events e WHERE e.created_at >= NOW() - make_interval(days => $1) GROUP BY 1
       ),
       ld AS (
         SELECT ${leadKey} AS k, COUNT(*)::int AS leads
         FROM leads l WHERE l.created_at >= NOW() - make_interval(days => $1) GROUP BY 1
       ),
       qt AS (
         SELECT ${leadKey} AS k, COUNT(*)::int AS quotes,
           COUNT(*) FILTER (WHERE q.status = ANY($2))::int AS quotes_signed,
           SUM(CASE WHEN COALESCE(q.currency, 'XOF') = 'XOF' THEN q.subtotal
                    ELSE ROUND(q.subtotal * COALESCE(q.exchange_rate_to_xof, CASE WHEN q.currency = 'EUR' THEN 655.957 ELSE 0 END))
               END) FILTER (WHERE q.status = ANY($2)) AS signed_amount_xof
         FROM quotes q LEFT JOIN leads l ON l.id = q.lead_id
         WHERE q.created_at >= NOW() - make_interval(days => $1) GROUP BY 1
       ),
       keys AS (SELECT k FROM ev UNION SELECT k FROM ld UNION SELECT k FROM qt)
       SELECT keys.k AS ${key === "channel" ? "channel" : "campaign"},
         COALESCE(ev.visits, 0) AS visits, COALESCE(ev.whatsapp_clicks, 0) AS whatsapp_clicks,
         COALESCE(ld.leads, 0) AS leads, COALESCE(qt.quotes, 0) AS quotes,
         COALESCE(qt.quotes_signed, 0) AS quotes_signed, qt.signed_amount_xof
       FROM (SELECT k FROM keys ${keyFilter}) keys
       LEFT JOIN ev ON ev.k IS NOT DISTINCT FROM keys.k
       LEFT JOIN ld ON ld.k IS NOT DISTINCT FROM keys.k
       LEFT JOIN qt ON qt.k IS NOT DISTINCT FROM keys.k`;
  };

  return withDb(async (query) => {
    const params = [days, SIGNED_QUOTE_STATUSES];
    const [channels, campaigns] = await Promise.all([
      query<ReportRow>(sql("channel"), params),
      query<ReportRow>(sql("campaign"), params),
    ]);
    const map = (r: ReportRow): AcquisitionRow => ({
      channel: (ACQUISITION_CHANNELS as readonly string[]).includes(r.channel ?? "")
        ? (r.channel as AcquisitionChannel)
        : null,
      campaign: r.campaign ?? null,
      visits: r.visits,
      whatsappClicks: r.whatsapp_clicks,
      leads: r.leads,
      quotes: r.quotes,
      quotesSigned: r.quotes_signed,
      signedAmountXof: Number(r.signed_amount_xof ?? 0),
    });
    const order = (a: AcquisitionRow, b: AcquisitionRow) =>
      b.signedAmountXof - a.signedAmountXof || b.leads - a.leads || b.visits - a.visits;
    return {
      days,
      channels: channels.rows.map(map).sort(order),
      campaigns: campaigns.rows.map(map).sort(order),
    };
  });
}
