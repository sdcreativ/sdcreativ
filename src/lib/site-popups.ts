import { randomBytes } from "node:crypto";
import { z } from "zod";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import type { BenefitTerms } from "@/lib/client-benefits-types";
import {
  DEFAULT_SITE_POPUP,
  generatePopupCode,
  pickPopupForVisitor,
  type createSitePopupSchema,
  type PublicSitePopup,
  type SitePopup,
  type updateSitePopupSchema,
} from "@/lib/site-popups-types";

type PopupRow = {
  id: string;
  name: string;
  is_active: boolean;
  locale: string;
  layout: string;
  variant: string;
  eyebrow: string;
  title: string;
  body: string;
  offer_label: string;
  cta_label: string;
  success_title: string;
  success_body: string;
  consent_text: string;
  ask_phone: boolean;
  ask_project: boolean;
  code_prefix: string;
  code_valid_days: number;
  trigger_delay_seconds: number | null;
  trigger_scroll_percent: number | null;
  trigger_exit_intent: boolean;
  show_on_mobile: boolean;
  audience: string;
  include_paths: string[];
  exclude_paths: string[];
  frequency_days: number;
  impressions: number;
  closes: number;
  signups: number;
  sort_order: number;
  benefit_kind: string;
  benefit_percent: string | number | null;
  benefit_start_months: number | null;
  benefit_duration_months: number | null;
  ab_test_key: string | null;
  reminders_enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

const numOrNull = (v: string | number | null) => (v == null ? null : Number(v));

const mapPopup = (r: PopupRow): SitePopup => ({
  id: r.id,
  name: r.name,
  isActive: r.is_active,
  locale: r.locale === "en" ? "en" : "fr",
  layout: r.layout === "slide" ? "slide" : "modal",
  variant: r.variant === "accent" ? "accent" : "primary",
  eyebrow: r.eyebrow,
  title: r.title,
  body: r.body,
  offerLabel: r.offer_label,
  ctaLabel: r.cta_label,
  successTitle: r.success_title,
  successBody: r.success_body,
  consentText: r.consent_text,
  askPhone: r.ask_phone,
  askProject: r.ask_project,
  codePrefix: r.code_prefix,
  codeValidDays: r.code_valid_days,
  triggerDelaySeconds: r.trigger_delay_seconds,
  triggerScrollPercent: r.trigger_scroll_percent,
  triggerExitIntent: r.trigger_exit_intent,
  showOnMobile: r.show_on_mobile,
  audience: r.audience === "new" || r.audience === "returning" ? r.audience : "all",
  includePaths: r.include_paths ?? [],
  excludePaths: r.exclude_paths ?? [],
  frequencyDays: r.frequency_days,
  impressions: r.impressions,
  closes: r.closes,
  signups: r.signups,
  sortOrder: r.sort_order,
  benefitKind: r.benefit_kind === "maintenance_discount" ? "maintenance_discount" : "none",
  benefitPercent: numOrNull(r.benefit_percent),
  benefitStartMonths: r.benefit_start_months,
  benefitDurationMonths: r.benefit_duration_months,
  abTestKey: r.ab_test_key || null,
  remindersEnabled: r.reminders_enabled,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString(),
});

/** Colonnes éditables : clé TS → colonne SQL. */
const COLUMNS = {
  name: "name",
  isActive: "is_active",
  locale: "locale",
  layout: "layout",
  variant: "variant",
  eyebrow: "eyebrow",
  title: "title",
  body: "body",
  offerLabel: "offer_label",
  ctaLabel: "cta_label",
  successTitle: "success_title",
  successBody: "success_body",
  consentText: "consent_text",
  askPhone: "ask_phone",
  askProject: "ask_project",
  codePrefix: "code_prefix",
  codeValidDays: "code_valid_days",
  triggerDelaySeconds: "trigger_delay_seconds",
  triggerScrollPercent: "trigger_scroll_percent",
  triggerExitIntent: "trigger_exit_intent",
  showOnMobile: "show_on_mobile",
  audience: "audience",
  includePaths: "include_paths",
  excludePaths: "exclude_paths",
  frequencyDays: "frequency_days",
  sortOrder: "sort_order",
  benefitKind: "benefit_kind",
  benefitPercent: "benefit_percent",
  benefitStartMonths: "benefit_start_months",
  benefitDurationMonths: "benefit_duration_months",
  abTestKey: "ab_test_key",
  remindersEnabled: "reminders_enabled",
} as const satisfies Record<keyof typeof DEFAULT_SITE_POPUP, string>;

type ColumnKey = keyof typeof COLUMNS;

export async function listSitePopups(): Promise<SitePopup[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<PopupRow>(`SELECT * FROM site_popups ORDER BY sort_order, created_at`);
    return rows.map(mapPopup);
  });
}

export async function createSitePopup(input: z.infer<typeof createSitePopupSchema>): Promise<SitePopup> {
  const data = { ...DEFAULT_SITE_POPUP, ...input };
  const keys = Object.keys(COLUMNS) as ColumnKey[];
  return withDb(async (query) => {
    const { rows } = await query<PopupRow>(
      `INSERT INTO site_popups (${keys.map((k) => COLUMNS[k]).join(", ")})
       VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`,
      keys.map((k) => data[k]),
    );
    return mapPopup(rows[0]!);
  });
}

export async function updateSitePopup(
  id: string,
  input: z.infer<typeof updateSitePopupSchema>,
): Promise<SitePopup | null> {
  const keys = (Object.keys(input) as ColumnKey[]).filter((k) => k in COLUMNS && input[k] !== undefined);
  return withDb(async (query) => {
    if (!keys.length) {
      const { rows } = await query<PopupRow>(`SELECT * FROM site_popups WHERE id = $1`, [id]);
      return rows[0] ? mapPopup(rows[0]) : null;
    }
    const sets = keys.map((k, i) => `${COLUMNS[k]} = $${i + 2}`).join(", ");
    const { rows } = await query<PopupRow>(
      `UPDATE site_popups SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...keys.map((k) => input[k])],
    );
    return rows[0] ? mapPopup(rows[0]) : null;
  });
}

export async function deleteSitePopup(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM site_popups WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

/** Popup actif de la langue pour cette page (ordre d'affichage), version A/B selon le seau du visiteur. */
export async function getActivePopupForPath(
  path: string,
  locale: "fr" | "en",
  bucket = 0,
): Promise<PublicSitePopup | null> {
  if (!isDatabaseConfigured()) return null;
  const popups = await withDb(async (query) => {
    const { rows } = await query<PopupRow>(
      `SELECT * FROM site_popups WHERE is_active = true AND locale = $1 ORDER BY sort_order, created_at`,
      [locale],
    );
    return rows.map(mapPopup);
  });
  const popup = pickPopupForVisitor(popups, path, bucket);
  if (!popup) return null;
  /* eslint-disable @typescript-eslint/no-unused-vars -- retrait des champs internes */
  const {
    impressions, closes, signups, createdAt, updatedAt, name, sortOrder, isActive, codePrefix, includePaths, excludePaths,
    benefitKind, benefitPercent, benefitStartMonths, benefitDurationMonths, abTestKey, remindersEnabled,
    ...pub
  } = popup;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return pub;
}

export async function recordPopupEvent(id: string, type: "impression" | "close"): Promise<void> {
  const column = type === "impression" ? "impressions" : "closes";
  await withDb(async (query) => {
    await query(`UPDATE site_popups SET ${column} = ${column} + 1 WHERE id = $1 AND is_active = true`, [id]);
  });
}

export type PopupSignup = {
  id: string;
  popupId: string | null;
  name: string;
  email: string;
  phone: string | null;
  projectType: string | null;
  offerLabel: string;
  code: string;
  codeExpiresAt: string;
  codeUsedAt: string | null;
  locale: string;
  pagePath: string | null;
  leadId: string | null;
  benefit: BenefitTerms;
  reminderCount: number;
  lastReminderAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};

type SignupRow = {
  id: string;
  popup_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  project_type: string | null;
  offer_label: string;
  code: string;
  code_expires_at: Date;
  code_used_at: Date | null;
  locale: string;
  page_path: string | null;
  lead_id: string | null;
  benefit_kind: string;
  benefit_percent: string | number | null;
  benefit_start_months: number | null;
  benefit_duration_months: number | null;
  reminder_count: number;
  last_reminder_at: Date | null;
  unsubscribed_at: Date | null;
  created_at: Date;
};

const mapSignup = (r: SignupRow): PopupSignup => ({
  id: r.id,
  popupId: r.popup_id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  projectType: r.project_type,
  offerLabel: r.offer_label,
  code: r.code,
  codeExpiresAt: r.code_expires_at.toISOString(),
  codeUsedAt: r.code_used_at ? r.code_used_at.toISOString() : null,
  locale: r.locale,
  pagePath: r.page_path,
  leadId: r.lead_id,
  benefit: {
    kind: r.benefit_kind === "maintenance_discount" ? "maintenance_discount" : "none",
    percent: numOrNull(r.benefit_percent),
    startMonths: r.benefit_start_months,
    durationMonths: r.benefit_duration_months,
  },
  reminderCount: r.reminder_count ?? 0,
  lastReminderAt: r.last_reminder_at ? r.last_reminder_at.toISOString() : null,
  unsubscribedAt: r.unsubscribed_at ? r.unsubscribed_at.toISOString() : null,
  createdAt: r.created_at.toISOString(),
});

/** Popup actif par id (inscription : on vérifie qu'il est toujours publié). */
export async function getActivePopupById(id: string): Promise<SitePopup | null> {
  return withDb(async (query) => {
    const { rows } = await query<PopupRow>(`SELECT * FROM site_popups WHERE id = $1 AND is_active = true`, [id]);
    return rows[0] ? mapPopup(rows[0]) : null;
  });
}

/**
 * Inscription : si cet e-mail a déjà un code valide et non utilisé pour ce popup, on le renvoie
 * (pas de multiplication des codes) ; sinon nouveau code unique, valable `codeValidDays` jours.
 */
export async function createPopupSignup(
  popup: SitePopup,
  input: { name: string; email: string; phone?: string; projectType?: string; pagePath?: string },
): Promise<{ signup: PopupSignup; reused: boolean }> {
  return withDb(async (query) => {
    const { rows: existing } = await query<SignupRow>(
      `SELECT * FROM site_popup_signups
       WHERE popup_id = $1 AND lower(email) = lower($2) AND code_used_at IS NULL AND code_expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [popup.id, input.email],
    );
    if (existing[0]) return { signup: mapSignup(existing[0]), reused: true };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generatePopupCode(popup.codePrefix, input.name, randomBytes(4));
      const { rows } = await query<SignupRow>(
        `INSERT INTO site_popup_signups (popup_id, name, email, phone, project_type, offer_label, code,
           code_expires_at, locale, page_path, benefit_kind, benefit_percent, benefit_start_months, benefit_duration_months)
         VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() + make_interval(days => $8), $9, $10, $11, $12, $13, $14)
         ON CONFLICT (code) DO NOTHING RETURNING *`,
        [
          popup.id,
          input.name,
          input.email.toLowerCase(),
          input.phone ?? null,
          input.projectType ?? null,
          popup.offerLabel,
          code,
          popup.codeValidDays,
          popup.locale,
          input.pagePath ?? null,
          popup.benefitKind,
          popup.benefitPercent,
          popup.benefitStartMonths,
          popup.benefitDurationMonths,
        ],
      );
      if (rows[0]) {
        await query(`UPDATE site_popups SET signups = signups + 1 WHERE id = $1`, [popup.id]);
        return { signup: mapSignup(rows[0]), reused: false };
      }
    }
    throw new Error("Impossible de générer un code unique.");
  });
}

export async function attachSignupLead(signupId: string, leadId: string): Promise<void> {
  await withDb(async (query) => {
    await query(`UPDATE site_popup_signups SET lead_id = $2 WHERE id = $1`, [signupId, leadId]);
  });
}

export async function listPopupSignups(limit = 100): Promise<PopupSignup[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<SignupRow>(
      `SELECT * FROM site_popup_signups ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(mapSignup);
  });
}

/** Code saisi dans le devis : valide s'il existe, n'est pas expiré et n'a pas déjà servi. */
export async function findValidPopupCode(code: string): Promise<PopupSignup | null> {
  if (!isDatabaseConfigured()) return null;
  return withDb(async (query) => {
    const { rows } = await query<SignupRow>(
      `SELECT * FROM site_popup_signups
       WHERE code = $1 AND code_used_at IS NULL AND code_expires_at > NOW() LIMIT 1`,
      [code],
    );
    return rows[0] ? mapSignup(rows[0]) : null;
  });
}

export async function markPopupCodeUsed(code: string): Promise<void> {
  await withDb(async (query) => {
    await query(`UPDATE site_popup_signups SET code_used_at = NOW() WHERE code = $1 AND code_used_at IS NULL`, [code]);
  });
}

/** Inscrits pouvant recevoir une relance : code non utilisé, encore valable, popup avec relances actives. */
export async function listSignupsForReminders(): Promise<Array<PopupSignup & { popupName: string | null }>> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<SignupRow & { popup_name: string | null }>(
      `SELECT s.*, p.name AS popup_name
       FROM site_popup_signups s
       JOIN site_popups p ON p.id = s.popup_id
       WHERE p.reminders_enabled = true
         AND s.code_used_at IS NULL AND s.unsubscribed_at IS NULL
         AND s.code_expires_at > NOW() + INTERVAL '1 day'
         AND s.reminder_count < $1
         -- Le visiteur a déjà demandé un devis (même sans son code) : pas de relance.
         AND NOT EXISTS (SELECT 1 FROM quotes q WHERE lower(q.email) = lower(s.email) AND q.created_at >= s.created_at)`,
      [2],
    );
    return rows.map((r) => ({ ...mapSignup(r), popupName: r.popup_name }));
  });
}

export async function markSignupReminded(id: string, reminderCount: number): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE site_popup_signups SET reminder_count = GREATEST(reminder_count, $2), last_reminder_at = NOW() WHERE id = $1`,
      [id, reminderCount],
    );
  });
}

export type PopupPerformance = {
  popupId: string;
  codesUsed: number;
  reminders: number;
  quotes: number;
  quotesSigned: number;
  /** Montant HT des devis signés, converti en FCFA. */
  signedAmountXof: number;
};

/** Signés = signé, validé, accepté ou facturé. */
const SIGNED_QUOTE_STATUSES = ["signed", "validated", "accepted", "invoiced"];

/**
 * Du popup au chiffre d'affaires : codes utilisés, devis demandés et devis signés attribués à chaque popup
 * (devis portant le code, ou rattaché au lead créé par l'inscription).
 */
export async function getPopupPerformance(): Promise<PopupPerformance[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<{
      popup_id: string;
      codes_used: number;
      reminders: number;
      quotes: number;
      quotes_signed: number;
      signed_amount_xof: string | null;
    }>(
      `WITH signups AS (
         SELECT popup_id, COUNT(code_used_at)::int AS codes_used, COALESCE(SUM(reminder_count), 0)::int AS reminders
         FROM site_popup_signups WHERE popup_id IS NOT NULL GROUP BY popup_id
       ),
       attributed AS (
         SELECT DISTINCT s.popup_id, q.id, q.status,
           CASE WHEN COALESCE(q.currency, 'XOF') = 'XOF' THEN q.subtotal
                -- Euro sans taux figé : parité fixe 1 € = 655,957 FCFA.
                ELSE ROUND(q.subtotal * COALESCE(q.exchange_rate_to_xof, CASE WHEN q.currency = 'EUR' THEN 655.957 ELSE 0 END))
           END AS amount_xof
         FROM site_popup_signups s
         JOIN quotes q ON q.metadata->>'promoCode' = s.code OR (s.lead_id IS NOT NULL AND q.lead_id = s.lead_id)
         WHERE s.popup_id IS NOT NULL
       ),
       quotes AS (
         SELECT popup_id, COUNT(*)::int AS quotes,
           COUNT(*) FILTER (WHERE status = ANY($1))::int AS quotes_signed,
           SUM(amount_xof) FILTER (WHERE status = ANY($1)) AS signed_amount_xof
         FROM attributed GROUP BY popup_id
       )
       SELECT s.popup_id, s.codes_used, s.reminders,
         COALESCE(q.quotes, 0) AS quotes, COALESCE(q.quotes_signed, 0) AS quotes_signed, q.signed_amount_xof
       FROM signups s LEFT JOIN quotes q ON q.popup_id = s.popup_id`,
      [SIGNED_QUOTE_STATUSES],
    );
    return rows.map((r) => ({
      popupId: r.popup_id,
      codesUsed: r.codes_used,
      reminders: r.reminders,
      quotes: r.quotes,
      quotesSigned: r.quotes_signed,
      signedAmountXof: Number(r.signed_amount_xof ?? 0),
    }));
  });
}
