import { createHmac, timingSafeEqual } from "node:crypto";
import { isDatabaseConfigured, withDb } from "@/lib/db";

/**
 * Désinscription des e-mails marketing (popups, séquences, campagnes) : lien signé par adresse,
 * sans expiration — un lien de désinscription doit toujours fonctionner.
 */
function getSecret(): string | null {
  const secret = process.env.ADMIN_SECRET?.trim() || process.env.CRM_WEBHOOK_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

function sign(email: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url");
}

export function signUnsubscribeToken(email: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const normalized = email.trim().toLowerCase();
  return `${Buffer.from(normalized, "utf8").toString("base64url")}.${sign(normalized, secret)}`;
}

/** Adresse du jeton, ou null s'il est invalide ou falsifié. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  const secret = getSecret();
  if (!secret || !token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const email = Buffer.from(encoded, "base64url").toString("utf8");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
}

/** Page de confirmation (lien du pied de l'e-mail) et point d'appel « un clic » (en-tête List-Unsubscribe). */
export function unsubscribeLinks(email: string): { pageUrl: string; oneClickUrl: string } | null {
  const token = signUnsubscribeToken(email);
  if (!token) return null;
  const t = encodeURIComponent(token);
  return { pageUrl: `${siteUrl()}/desinscription?t=${t}`, oneClickUrl: `${siteUrl()}/api/public/unsubscribe?t=${t}` };
}

export function unsubscribeFooterHtml(pageUrl: string, locale: "fr" | "en" = "fr"): string {
  const text =
    locale === "en"
      ? `You receive this email because you asked SD CREATIV for an offer or news. <a href="${pageUrl}" style="color:#64748b">Unsubscribe</a>.`
      : `Vous recevez cet e-mail suite à votre demande d'offre ou d'informations auprès de SD CREATIV. <a href="${pageUrl}" style="color:#64748b">Se désinscrire</a>.`;
  return `<p style="margin-top:28px;font-size:12px;line-height:1.5;color:#64748b">${text}</p>`;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  return withDb(async (query) => {
    const { rows } = await query(
      `SELECT 1 FROM newsletter_subscribers WHERE lower(email) = lower($1) AND status = 'unsubscribed' LIMIT 1`,
      [email],
    );
    return rows.length > 0;
  });
}

/**
 * Désinscrit une adresse de tout envoi marketing : liste newsletter, consentement des leads,
 * relances popup et séquences en cours. Les e-mails transactionnels (devis, factures) continuent.
 */
export async function unsubscribeEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await withDb(async (query) => {
    await query(
      `INSERT INTO newsletter_subscribers (email, source, status, unsubscribed_at)
       VALUES ($1, 'unsubscribe', 'unsubscribed', NOW())
       ON CONFLICT (email) DO UPDATE SET status = 'unsubscribed', unsubscribed_at = COALESCE(newsletter_subscribers.unsubscribed_at, NOW())`,
      [normalized],
    );
    await query(`UPDATE leads SET marketing_opt_in = false, updated_at = NOW() WHERE lower(email) = $1 AND marketing_opt_in = true`, [
      normalized,
    ]);
    await query(
      `UPDATE site_popup_signups SET unsubscribed_at = NOW() WHERE lower(email) = $1 AND unsubscribed_at IS NULL`,
      [normalized],
    );
    await query(
      `UPDATE lead_sequence_enrollments SET completed_at = NOW()
       WHERE completed_at IS NULL AND lead_id IN (SELECT id FROM leads WHERE lower(email) = $1)`,
      [normalized],
    );
  });
}
