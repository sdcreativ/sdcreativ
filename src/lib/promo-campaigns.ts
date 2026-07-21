import { z } from "zod";
import { withDb, isDatabaseConfigured } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createLeadActivity } from "@/lib/lead-activities";
import { createTask } from "@/lib/tasks";
import { createAdminBillingNotification } from "@/lib/billing/notifications";
import { listFiredReminderKeysForChannel, markRemindersFired } from "@/lib/crm-reminders";
import { signPromoEnrollmentToken } from "@/lib/promo-campaign-token";

export const PROMO_CAMPAIGN_STATUSES = ["draft", "active", "ended"] as const;
export const PROMO_ENROLLMENT_STATUSES = [
  "eligible",
  "sent",
  "clicked",
  "confirmed",
  "converted",
  "excluded",
] as const;

export type PromoCampaignStatus = (typeof PROMO_CAMPAIGN_STATUSES)[number];
export type PromoEnrollmentStatus = (typeof PROMO_ENROLLMENT_STATUSES)[number];

export type PromoCampaign = {
  id: string;
  name: string;
  offerTitle: string;
  offerDescription: string;
  startsAt: string;
  endsAt: string;
  status: PromoCampaignStatus;
  emailSubject: string;
  emailHtml: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: {
    eligible: number;
    sent: number;
    clicked: number;
    confirmed: number;
    converted: number;
  };
};

export type PromoEnrollment = {
  id: string;
  campaignId: string;
  quoteId: string;
  leadId: string | null;
  clientId: string | null;
  email: string;
  contactName: string;
  status: PromoEnrollmentStatus;
  sentAt: string | null;
  clickedAt: string | null;
  confirmedAt: string | null;
  quoteReference?: string;
};

export type PromoAudiencePreview = {
  quoteId: string;
  reference: string;
  email: string;
  name: string;
  company: string | null;
  leadId: string | null;
  clientId: string | null;
  optInSource: "newsletter" | "lead_opt_in" | "both";
};

const WARM_QUOTE_STATUSES = ["sent", "viewed", "follow_up", "negotiation"] as const;

export const DEFAULT_PROMO_EMAIL_SUBJECT =
  "{{offer}} — votre devis {{quote_ref}} est toujours valable";

export const DEFAULT_PROMO_EMAIL_HTML = `<p>Bonjour {{name}},</p>
<p>Votre devis <strong>{{quote_ref}}</strong> est toujours d’actualité.</p>
<p><strong>Offre limitée jusqu’au {{ends_at}} :</strong> {{offer}}</p>
<p>{{offer_description}}</p>
<p>Confirmez votre intérêt en un clic — un conseiller SD CREATIV vous recontacte rapidement :</p>
<p style="margin:24px 0"><a href="{{cta_url}}" style="display:inline-block;background:#1e40af;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Je suis intéressé(e)</a></p>
<p>À très bientôt,<br/>L’équipe SD CREATIV</p>`;

export const createPromoCampaignSchema = z.object({
  name: z.string().trim().min(2).max(160),
  offerTitle: z.string().trim().min(2).max(200),
  offerDescription: z.string().trim().max(5000).optional().default(""),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(8)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(8)),
  emailSubject: z.string().trim().min(2).max(200).optional(),
  emailHtml: z.string().trim().min(10).max(100_000).optional(),
});

export const updatePromoCampaignSchema = createPromoCampaignSchema.partial().extend({
  status: z.enum(PROMO_CAMPAIGN_STATUSES).optional(),
});

type CampaignRow = {
  id: string;
  name: string;
  offer_title: string;
  offer_description: string;
  starts_at: Date;
  ends_at: Date;
  status: PromoCampaignStatus;
  email_subject: string;
  email_html: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapCampaign(row: CampaignRow, stats?: PromoCampaign["stats"]): PromoCampaign {
  return {
    id: row.id,
    name: row.name,
    offerTitle: row.offer_title,
    offerDescription: row.offer_description,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    status: row.status,
    emailSubject: row.email_subject,
    emailHtml: row.email_html,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    stats,
  };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
}

function toDate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error("Date invalide.");
  return d;
}

export async function listPromoCampaigns(): Promise<PromoCampaign[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<CampaignRow>(
      `SELECT * FROM promo_campaigns ORDER BY created_at DESC`,
    );
    const result: PromoCampaign[] = [];
    for (const row of rows) {
      const { rows: counts } = await query<{ status: string; n: string }>(
        `SELECT status, COUNT(*)::text AS n FROM promo_campaign_enrollments
         WHERE campaign_id = $1 GROUP BY status`,
        [row.id],
      );
      const stats = {
        eligible: 0,
        sent: 0,
        clicked: 0,
        confirmed: 0,
        converted: 0,
      };
      for (const c of counts) {
        const n = Number(c.n) || 0;
        if (c.status === "eligible") stats.eligible += n;
        if (c.status === "sent") stats.sent += n;
        if (c.status === "clicked") stats.clicked += n;
        if (c.status === "confirmed") stats.confirmed += n;
        if (c.status === "converted") stats.converted += n;
        // sent+ includes clicked/confirmed for "envoyés" display: treat sent+ as cumulative later in UI
      }
      // "sent" KPI = anything beyond eligible
      const sentTotal = stats.sent + stats.clicked + stats.confirmed + stats.converted;
      result.push(
        mapCampaign(row, {
          ...stats,
          sent: sentTotal,
          eligible: stats.eligible + sentTotal,
        }),
      );
    }
    return result;
  });
}

export async function getPromoCampaignById(id: string): Promise<PromoCampaign | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<CampaignRow>(`SELECT * FROM promo_campaigns WHERE id = $1`, [id]);
    return rows[0] ? mapCampaign(rows[0]) : null;
  });
}

export async function createPromoCampaign(
  input: z.infer<typeof createPromoCampaignSchema>,
  createdBy?: string | null,
): Promise<PromoCampaign> {
  const startsAt = toDate(input.startsAt);
  const endsAt = toDate(input.endsAt);
  if (endsAt <= startsAt) throw new Error("La date de fin doit être après le début.");

  return withDb(async (query) => {
    const { rows } = await query<CampaignRow>(
      `INSERT INTO promo_campaigns (
         name, offer_title, offer_description, starts_at, ends_at,
         email_subject, email_html, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        input.name,
        input.offerTitle,
        input.offerDescription ?? "",
        startsAt,
        endsAt,
        input.emailSubject?.trim() || DEFAULT_PROMO_EMAIL_SUBJECT,
        input.emailHtml?.trim() || DEFAULT_PROMO_EMAIL_HTML,
        createdBy ?? null,
      ],
    );
    return mapCampaign(rows[0]!);
  });
}

export async function updatePromoCampaign(
  id: string,
  input: z.infer<typeof updatePromoCampaignSchema>,
): Promise<PromoCampaign | null> {
  const current = await getPromoCampaignById(id);
  if (!current) return null;

  const startsAt = input.startsAt ? toDate(input.startsAt) : new Date(current.startsAt);
  const endsAt = input.endsAt ? toDate(input.endsAt) : new Date(current.endsAt);
  if (endsAt <= startsAt) throw new Error("La date de fin doit être après le début.");

  return withDb(async (query) => {
    const { rows } = await query<CampaignRow>(
      `UPDATE promo_campaigns SET
         name = $2,
         offer_title = $3,
         offer_description = $4,
         starts_at = $5,
         ends_at = $6,
         status = $7,
         email_subject = $8,
         email_html = $9,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.name ?? current.name,
        input.offerTitle ?? current.offerTitle,
        input.offerDescription ?? current.offerDescription,
        startsAt,
        endsAt,
        input.status ?? current.status,
        input.emailSubject ?? current.emailSubject,
        input.emailHtml ?? current.emailHtml,
      ],
    );
    return rows[0] ? mapCampaign(rows[0]) : null;
  });
}

/** Audience A+B : devis tièdes + (newsletter active OU lead.marketing_opt_in). */
export async function previewPromoAudience(): Promise<PromoAudiencePreview[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<{
      quote_id: string;
      reference: string;
      email: string;
      name: string;
      company: string | null;
      lead_id: string | null;
      client_id: string | null;
      newsletter: boolean;
      lead_opt_in: boolean;
    }>(
      `SELECT
         q.id AS quote_id,
         q.reference,
         q.email,
         q.name,
         q.company,
         q.lead_id,
         q.client_id,
         EXISTS (
           SELECT 1 FROM newsletter_subscribers ns
           WHERE lower(ns.email) = lower(q.email) AND ns.status = 'active'
         ) AS newsletter,
         COALESCE(l.marketing_opt_in, false) AS lead_opt_in
       FROM quotes q
       LEFT JOIN leads l ON l.id = q.lead_id
       WHERE q.status = ANY($1::text[])
         AND (
           EXISTS (
             SELECT 1 FROM newsletter_subscribers ns
             WHERE lower(ns.email) = lower(q.email) AND ns.status = 'active'
           )
           OR COALESCE(l.marketing_opt_in, false) = true
         )
       ORDER BY q.sent_at DESC NULLS LAST, q.updated_at DESC
       LIMIT 500`,
      [WARM_QUOTE_STATUSES],
    );

    return rows.map((r) => ({
      quoteId: r.quote_id,
      reference: r.reference,
      email: r.email,
      name: r.name,
      company: r.company,
      leadId: r.lead_id,
      clientId: r.client_id,
      optInSource:
        r.newsletter && r.lead_opt_in
          ? "both"
          : r.newsletter
            ? "newsletter"
            : "lead_opt_in",
    }));
  });
}

export async function listCampaignEnrollments(campaignId: string): Promise<PromoEnrollment[]> {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      campaign_id: string;
      quote_id: string;
      lead_id: string | null;
      client_id: string | null;
      email: string;
      contact_name: string;
      status: PromoEnrollmentStatus;
      sent_at: Date | null;
      clicked_at: Date | null;
      confirmed_at: Date | null;
      reference: string | null;
    }>(
      `SELECT e.*, q.reference
       FROM promo_campaign_enrollments e
       LEFT JOIN quotes q ON q.id = e.quote_id
       WHERE e.campaign_id = $1
       ORDER BY e.created_at DESC`,
      [campaignId],
    );
    return rows.map((r) => ({
      id: r.id,
      campaignId: r.campaign_id,
      quoteId: r.quote_id,
      leadId: r.lead_id,
      clientId: r.client_id,
      email: r.email,
      contactName: r.contact_name,
      status: r.status,
      sentAt: r.sent_at?.toISOString() ?? null,
      clickedAt: r.clicked_at?.toISOString() ?? null,
      confirmedAt: r.confirmed_at?.toISOString() ?? null,
      quoteReference: r.reference ?? undefined,
    }));
  });
}

export async function syncCampaignEnrollments(campaignId: string): Promise<{ added: number }> {
  const campaign = await getPromoCampaignById(campaignId);
  if (!campaign) throw new Error("Campagne introuvable.");
  if (campaign.status === "ended") throw new Error("Campagne terminée.");

  const audience = await previewPromoAudience();
  let added = 0;
  await withDb(async (query) => {
    for (const row of audience) {
      const { rowCount } = await query(
        `INSERT INTO promo_campaign_enrollments (
           campaign_id, quote_id, lead_id, client_id, email, contact_name, status
         ) VALUES ($1,$2,$3,$4,$5,$6,'eligible')
         ON CONFLICT (campaign_id, quote_id) DO NOTHING`,
        [
          campaignId,
          row.quoteId,
          row.leadId,
          row.clientId,
          row.email,
          row.name,
        ],
      );
      if (rowCount) added += rowCount;
    }
  });
  return { added };
}

function reminderKey(campaignId: string, enrollmentId: string): string {
  return `promo-campaign:${campaignId}:${enrollmentId}`;
}

export async function sendCampaignEmails(
  campaignId: string,
  options?: { limit?: number },
): Promise<{ sent: number; skipped: number }> {
  const campaign = await getPromoCampaignById(campaignId);
  if (!campaign) throw new Error("Campagne introuvable.");
  if (campaign.status !== "active") throw new Error("Activez la campagne avant l’envoi.");

  const now = Date.now();
  if (now < new Date(campaign.startsAt).getTime()) {
    throw new Error("La campagne n’a pas encore commencé.");
  }
  if (now > new Date(campaign.endsAt).getTime()) {
    await updatePromoCampaign(campaignId, { status: "ended" });
    throw new Error("La campagne est terminée.");
  }

  const limit = options?.limit ?? 100;
  let sent = 0;
  let skipped = 0;

  await withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      email: string;
      contact_name: string;
      quote_id: string;
      reference: string;
    }>(
      `SELECT e.id, e.email, e.contact_name, e.quote_id, q.reference
       FROM promo_campaign_enrollments e
       JOIN quotes q ON q.id = e.quote_id
       WHERE e.campaign_id = $1 AND e.status = 'eligible'
       ORDER BY e.created_at ASC
       LIMIT $2`,
      [campaignId, limit],
    );

    const keys = rows.map((r) => reminderKey(campaignId, r.id));
    const fired = await listFiredReminderKeysForChannel(keys, "email");

    for (const row of rows) {
      const key = reminderKey(campaignId, row.id);
      if (fired.has(key)) {
        skipped += 1;
        continue;
      }

      const token = signPromoEnrollmentToken(
        row.id,
        new Date(campaign.endsAt).getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const ctaUrl = `${siteUrl()}/promo/${token}`;
      const vars = {
        name: row.contact_name || "Bonjour",
        company: "",
        quote_ref: row.reference,
        offer: campaign.offerTitle,
        offer_description: campaign.offerDescription,
        ends_at: new Date(campaign.endsAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        cta_url: ctaUrl,
      };

      const ok = await sendEmail({
        to: row.email,
        subject: renderTemplate(campaign.emailSubject, vars),
        html: renderTemplate(campaign.emailHtml, vars),
      });

      if (!ok) {
        skipped += 1;
        continue;
      }

      await query(
        `UPDATE promo_campaign_enrollments
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [row.id],
      );
      await markRemindersFired([
        {
          key,
          itemType: "promo_campaign",
          itemId: row.id,
          title: `Promo ${campaign.name}`,
          triggerAt: new Date().toISOString(),
          channels: ["email"],
        },
      ]);
      sent += 1;
    }
  });

  return { sent, skipped };
}

export async function processPromoCampaigns(): Promise<{
  ended: number;
  sent: number;
  skipped: number;
}> {
  if (!isDatabaseConfigured()) return { ended: 0, sent: 0, skipped: 0 };

  let ended = 0;
  let sent = 0;
  let skipped = 0;

  const campaigns = await listPromoCampaigns();
  const now = Date.now();

  for (const campaign of campaigns) {
    if (campaign.status === "active" && now > new Date(campaign.endsAt).getTime()) {
      await updatePromoCampaign(campaign.id, { status: "ended" });
      ended += 1;
      continue;
    }
    if (campaign.status !== "active") continue;
    if (now < new Date(campaign.startsAt).getTime()) continue;

    await syncCampaignEnrollments(campaign.id);
    const result = await sendCampaignEmails(campaign.id, { limit: 50 });
    sent += result.sent;
    skipped += result.skipped;
  }

  return { ended, sent, skipped };
}

export async function getEnrollmentPublicView(enrollmentId: string): Promise<{
  enrollment: PromoEnrollment;
  campaign: PromoCampaign;
} | null> {
  const campaignList = await withDb(async (query) => {
    const { rows } = await query<
      CampaignRow & {
        enrollment_id: string;
        quote_id: string;
        lead_id: string | null;
        client_id: string | null;
        email: string;
        contact_name: string;
        enrollment_status: PromoEnrollmentStatus;
        sent_at: Date | null;
        clicked_at: Date | null;
        confirmed_at: Date | null;
        reference: string | null;
      }
    >(
      `SELECT c.*, e.id AS enrollment_id, e.quote_id, e.lead_id, e.client_id,
              e.email, e.contact_name, e.status AS enrollment_status,
              e.sent_at, e.clicked_at, e.confirmed_at, q.reference
       FROM promo_campaign_enrollments e
       JOIN promo_campaigns c ON c.id = e.campaign_id
       LEFT JOIN quotes q ON q.id = e.quote_id
       WHERE e.id = $1`,
      [enrollmentId],
    );
    return rows[0] ?? null;
  });

  if (!campaignList) return null;

  return {
    campaign: mapCampaign(campaignList),
    enrollment: {
      id: campaignList.enrollment_id,
      campaignId: campaignList.id,
      quoteId: campaignList.quote_id,
      leadId: campaignList.lead_id,
      clientId: campaignList.client_id,
      email: campaignList.email,
      contactName: campaignList.contact_name,
      status: campaignList.enrollment_status,
      sentAt: campaignList.sent_at?.toISOString() ?? null,
      clickedAt: campaignList.clicked_at?.toISOString() ?? null,
      confirmedAt: campaignList.confirmed_at?.toISOString() ?? null,
      quoteReference: campaignList.reference ?? undefined,
    },
  };
}

export async function confirmPromoEnrollment(enrollmentId: string): Promise<{
  alreadyConfirmed: boolean;
  campaignName: string;
  offerTitle: string;
}> {
  const view = await getEnrollmentPublicView(enrollmentId);
  if (!view) throw new Error("Lien invalide ou expiré.");

  const { enrollment, campaign } = view;
  if (campaign.status === "ended" && enrollment.status !== "confirmed") {
    throw new Error("Cette offre est terminée.");
  }

  if (enrollment.status === "confirmed" || enrollment.status === "converted") {
    return {
      alreadyConfirmed: true,
      campaignName: campaign.name,
      offerTitle: campaign.offerTitle,
    };
  }

  await withDb(async (query) => {
    await query(
      `UPDATE promo_campaign_enrollments
       SET status = 'confirmed',
           confirmed_at = NOW(),
           clicked_at = COALESCE(clicked_at, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [enrollmentId],
    );

    if (enrollment.quoteId) {
      await query(
        `UPDATE quotes SET status = CASE
           WHEN status IN ('sent', 'viewed') THEN 'follow_up'
           ELSE status
         END,
         follow_up_at = COALESCE(follow_up_at, NOW()),
         updated_at = NOW()
         WHERE id = $1`,
        [enrollment.quoteId],
      );
    }
  });

  if (enrollment.leadId) {
    await createLeadActivity({
      leadId: enrollment.leadId,
      type: "note",
      content: `Campagne promo « ${campaign.name} » : intérêt confirmé (${campaign.offerTitle}).`,
      actorName: "Campagne promo",
    }).catch(() => undefined);
  }

  const due = new Date();
  due.setDate(due.getDate() + 1);
  await createTask({
    title: `Relance promo — ${enrollment.contactName || enrollment.email}`,
    description: `Intérêt confirmé pour « ${campaign.offerTitle} » (campagne ${campaign.name}). Devis ${enrollment.quoteReference ?? enrollment.quoteId}.`,
    status: "todo",
    priority: "high",
    dueDate: due.toISOString().slice(0, 10),
    leadId: enrollment.leadId,
    clientId: enrollment.clientId,
    metadata: {
      source: "promo_campaign",
      campaignId: campaign.id,
      enrollmentId,
      quoteId: enrollment.quoteId,
    },
  }).catch((err) => console.error("[promo] createTask", err));

  await createAdminBillingNotification({
    eventType: "promo_interest",
    title: "Intérêt campagne promo",
    message: `${enrollment.contactName || enrollment.email} a confirmé « ${campaign.offerTitle} ».`,
    linkHref: enrollment.leadId
      ? `/admin/crm/leads?id=${enrollment.leadId}`
      : `/admin/crm/devis?id=${enrollment.quoteId}`,
    entityType: "promo_campaign",
    entityId: campaign.id,
  }).catch(() => undefined);

  return {
    alreadyConfirmed: false,
    campaignName: campaign.name,
    offerTitle: campaign.offerTitle,
  };
}

export async function markPromoEnrollmentClicked(enrollmentId: string): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE promo_campaign_enrollments
       SET status = CASE WHEN status = 'sent' THEN 'clicked' ELSE status END,
           clicked_at = COALESCE(clicked_at, NOW()),
           updated_at = NOW()
       WHERE id = $1 AND status IN ('sent', 'clicked')`,
      [enrollmentId],
    );
  });
}
