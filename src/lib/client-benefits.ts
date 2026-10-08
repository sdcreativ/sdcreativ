import { isDatabaseConfigured, withDb } from "@/lib/db";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getLeadById } from "@/lib/leads";
import { createTask } from "@/lib/tasks";
import type { Quote } from "@/lib/quotes";
import {
  benefitAppliesOn,
  benefitWindow,
  hasBenefit,
  type BenefitKind,
  type BenefitStatus,
  type BenefitTerms,
} from "@/lib/client-benefits-types";

export type ClientBenefit = {
  id: string;
  clientId: string | null;
  email: string;
  clientName: string;
  quoteId: string | null;
  promoCode: string;
  label: string;
  kind: BenefitKind;
  percent: number;
  startsOn: string;
  endsOn: string;
  status: BenefitStatus;
  appliedCount: number;
  lastInvoiceId: string | null;
  reminderSentAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  client_id: string | null;
  email: string;
  client_name: string;
  quote_id: string | null;
  promo_code: string;
  label: string;
  kind: string;
  percent: string | number;
  starts_on: Date | string;
  ends_on: Date | string;
  status: string;
  applied_count: number;
  last_invoice_id: string | null;
  reminder_sent_at: Date | null;
  created_at: Date;
};

/**
 * Colonne DATE → « AAAA-MM-JJ ». Le pilote pg crée ces dates à minuit HEURE LOCALE : on lit donc les
 * composantes locales (toISOString décalerait d'un jour hors UTC, ex. Paris UTC+2).
 */
const day = (v: Date | string) => {
  if (typeof v === "string") return v.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
};

const mapRow = (r: Row): ClientBenefit => ({
  id: r.id,
  clientId: r.client_id,
  email: r.email,
  clientName: r.client_name,
  quoteId: r.quote_id,
  promoCode: r.promo_code,
  label: r.label,
  kind: r.kind === "maintenance_discount" ? "maintenance_discount" : "none",
  percent: Number(r.percent),
  startsOn: day(r.starts_on),
  endsOn: day(r.ends_on),
  status: (["pending", "active", "completed", "missed", "cancelled"] as const).find((s) => s === r.status) ?? "pending",
  appliedCount: r.applied_count,
  lastInvoiceId: r.last_invoice_id,
  reminderSentAt: r.reminder_sent_at ? r.reminder_sent_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

type SignupBenefitRow = {
  id: string;
  offer_label: string;
  benefit_kind: string;
  benefit_percent: string | number | null;
  benefit_start_months: number | null;
  benefit_duration_months: number | null;
};

/** Code avantage d'un devis : sur le devis lui-même, sinon sur le lead d'origine (inscription popup). */
async function promoCodeForQuote(quote: Quote): Promise<string | null> {
  const fromQuote = quote.metadata?.promoCode;
  if (typeof fromQuote === "string" && fromQuote) return fromQuote;
  if (!quote.leadId) return null;
  const lead = await getLeadById(quote.leadId).catch(() => null);
  const fromLead = lead?.metadata?.promoCode;
  return typeof fromLead === "string" && fromLead ? fromLead : null;
}

/**
 * Devis signé / accepté / validé : enregistre l'avantage promis lié à son code (idempotent).
 * La période démarre à la date de signature + le délai prévu (ex. 12 mois → 2e année).
 */
export async function registerQuoteBenefit(quote: Quote): Promise<ClientBenefit | null> {
  if (!isDatabaseConfigured()) return null;
  const code = await promoCodeForQuote(quote);
  if (!code) return null;

  return withDb(async (query) => {
    const { rows: signups } = await query<SignupBenefitRow>(
      `SELECT id, offer_label, benefit_kind, benefit_percent, benefit_start_months, benefit_duration_months
       FROM site_popup_signups WHERE code = $1`,
      [code],
    );
    const signup = signups[0];
    if (!signup) return null;
    const terms: BenefitTerms = {
      kind: signup.benefit_kind === "maintenance_discount" ? "maintenance_discount" : "none",
      percent: signup.benefit_percent == null ? null : Number(signup.benefit_percent),
      startMonths: signup.benefit_start_months,
      durationMonths: signup.benefit_duration_months,
    };
    if (!hasBenefit(terms)) return null;

    const signedOn = (quote.signedAt ?? new Date().toISOString()).slice(0, 10);
    const { startsOn, endsOn } = benefitWindow(signedOn, terms.startMonths, terms.durationMonths);
    const { rows } = await query<Row>(
      `INSERT INTO client_benefits (client_id, email, client_name, quote_id, signup_id, promo_code, label, kind,
         percent, starts_on, ends_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (quote_id, promo_code) DO NOTHING RETURNING *`,
      [
        quote.clientId,
        quote.email.toLowerCase(),
        quote.company || quote.name,
        quote.id,
        signup.id,
        code,
        signup.offer_label,
        terms.kind,
        terms.percent,
        startsOn,
        endsOn,
      ],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
}

/** Ne bloque jamais la signature : l'enregistrement de l'avantage est journalisé en cas d'échec. */
export function registerQuoteBenefitSafely(quote: Quote): void {
  void registerQuoteBenefit(quote).catch((error) => console.error("[client-benefits] register", quote.id, error));
}

export async function listClientBenefits(): Promise<ClientBenefit[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<Row>(`SELECT * FROM client_benefits ORDER BY starts_on ASC, created_at DESC`);
    return rows.map(mapRow);
  });
}

/** Avantages à appliquer à une facture du client à cette date (rattachement par client ou e-mail). */
export async function benefitsApplicableTo(
  client: { id: string; email: string },
  billingDate: string,
): Promise<ClientBenefit[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await withDb(async (query) => {
    const { rows: found } = await query<Row>(
      `SELECT * FROM client_benefits
       WHERE status IN ('pending','active') AND kind = 'maintenance_discount'
         AND (client_id = $1 OR (client_id IS NULL AND lower(email) = lower($2)))`,
      [client.id, client.email],
    );
    // Rattache au client les avantages enregistrés avant la création de sa fiche.
    await query(
      `UPDATE client_benefits SET client_id = $1, updated_at = NOW() WHERE client_id IS NULL AND lower(email) = lower($2)`,
      [client.id, client.email],
    );
    return found.map(mapRow);
  });
  return rows.filter((b) => benefitAppliesOn(b, billingDate));
}

export async function markBenefitApplied(benefitId: string, invoiceId: string): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE client_benefits SET status = 'active', applied_count = applied_count + 1, last_invoice_id = $2,
         updated_at = NOW() WHERE id = $1`,
      [benefitId, invoiceId],
    );
  });
}

export async function cancelClientBenefit(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE client_benefits SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status IN ('pending','active')`,
      [id],
    );
    return (rowCount ?? 0) > 0;
  });
}

const fr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export type BenefitReminderResult = { reminders: number; completed: number; missed: number };

/**
 * Tâche quotidienne :
 * - 30 jours avant le début : tâche CRM + e-mail interne + e-mail au client (« comme promis… ») ;
 * - fin de période : « terminé » si appliqué, sinon « non appliqué » + tâche et alerte.
 */
export async function processBenefitReminders(now = new Date(), reminderDays = 30): Promise<BenefitReminderResult> {
  const today = now.toISOString().slice(0, 10);
  // Rappel dès que le début de l'avantage est à moins de `reminderDays` jours.
  const horizon = new Date(now.getTime() + reminderDays * 86_400_000).toISOString().slice(0, 10);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
  const result: BenefitReminderResult = { reminders: 0, completed: 0, missed: 0 };

  const benefits = await listClientBenefits();
  for (const b of benefits) {
    if (b.status === "pending" && !b.reminderSentAt && b.startsOn <= horizon && b.endsOn > today) {
      const pct = b.percent.toLocaleString("fr-FR");
      await createTask({
        title: `Avantage promis : -${pct} % maintenance — ${b.clientName || b.email}`,
        description:
          `Code ${b.promoCode} (${b.label}). Remise à appliquer du ${fr(b.startsOn)} au ${fr(b.endsOn)}.\n` +
          `Elle s'applique automatiquement aux factures de l'abonnement de maintenance du client : ` +
          `vérifiez que le contrat et l'abonnement de maintenance existent (prix, mensuel ou annuel).`,
        status: "todo",
        priority: "high",
        dueDate: b.startsOn,
        clientId: b.clientId,
        metadata: { clientBenefitId: b.id, promoCode: b.promoCode },
      });
      await sendEmail({
        subject: `[SD CREATIV CRM] Avantage promis à venir — ${b.clientName || b.email} (${b.promoCode})`,
        html: `<p>Le ${escapeHtml(fr(b.startsOn))}, la maintenance de <strong>${escapeHtml(b.clientName || b.email)}</strong>
               bénéficie de <strong>-${escapeHtml(pct)} %</strong> (code ${escapeHtml(b.promoCode)}).</p>
               <p>La remise sera appliquée automatiquement aux factures de maintenance (générées en brouillon).
               Vérifiez que le contrat et l'abonnement de maintenance du client sont en place.</p>
               <p><a href="${siteUrl}/admin/crm/site/popups">Voir les avantages promis</a></p>`,
      });
      await sendEmail({
        to: b.email,
        subject: "Votre avantage SD CREATIV arrive : maintenance à tarif réduit",
        html: `<p>Bonjour,</p>
               <p>Comme promis lors de votre commande, votre maintenance bénéficie de
               <strong>-${escapeHtml(pct)} %</strong> à partir du ${escapeHtml(fr(b.startsOn))}
               et jusqu'au ${escapeHtml(fr(b.endsOn))} (code ${escapeHtml(b.promoCode)}).</p>
               <p>Rien à faire de votre côté : la remise figurera directement sur vos factures.</p>
               <p>Merci de votre confiance,<br>L'équipe SD CREATIV</p>`,
      });
      await withDb(async (query) => {
        await query(`UPDATE client_benefits SET reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`, [b.id]);
      });
      result.reminders += 1;
    }

    if ((b.status === "pending" || b.status === "active") && b.endsOn <= today) {
      const applied = b.status === "active";
      await withDb(async (query) => {
        await query(`UPDATE client_benefits SET status = $2, updated_at = NOW() WHERE id = $1`, [
          b.id,
          applied ? "completed" : "missed",
        ]);
      });
      if (applied) {
        result.completed += 1;
      } else {
        result.missed += 1;
        await createTask({
          title: `À régulariser : avantage non appliqué — ${b.clientName || b.email}`,
          description: `La période de l'avantage « ${b.label} » (code ${b.promoCode}) est terminée sans aucune facture remisée. Régularisez avec le client (avoir ou remise).`,
          status: "todo",
          priority: "high",
          dueDate: today,
          clientId: b.clientId,
          metadata: { clientBenefitId: b.id, promoCode: b.promoCode },
        });
        await sendEmail({
          subject: `[SD CREATIV CRM] ⚠ Avantage promis NON appliqué — ${b.clientName || b.email}`,
          html: `<p>L'avantage « ${escapeHtml(b.label)} » (code ${escapeHtml(b.promoCode)}) a expiré le ${escapeHtml(fr(b.endsOn))}
                 sans avoir été appliqué. Une tâche de régularisation a été créée.</p>`,
        });
      }
    }
  }
  return result;
}
