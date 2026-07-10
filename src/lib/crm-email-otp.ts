import { createHash, randomInt, timingSafeEqual } from "crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getCrmSettings } from "@/lib/crm-settings";
import { withDb } from "@/lib/db";
import { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";

export { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";

export const LOGIN_OTP_EXPIRY_MINUTES = 10;
export const LOGIN_OTP_RESEND_COOLDOWN_SEC = 60;

/** Sans 0/O/1/I pour une saisie fiable. */
const OTP_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLoginEmailOtp(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += OTP_CHARSET[randomInt(OTP_CHARSET.length)]!;
  }
  return `SD-${suffix}`;
}

export function hashLoginEmailOtp(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function buildLoginOtpEmailHtml(params: {
  name: string;
  code: string;
  agencyName: string;
  expiresMinutes: number;
  ipAddress?: string;
}): string {
  const { name, code, agencyName, expiresMinutes, ipAddress } = params;
  const ipLine = ipAddress
    ? `<p style="font-size:13px;color:#64748b">Connexion demandée depuis l'adresse IP <strong>${escapeHtml(ipAddress)}</strong>.</p>`
    : "";

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px">
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>Voici votre code de vérification pour accéder au CRM <strong>${escapeHtml(agencyName)}</strong> :</p>
      <p style="margin:28px 0;text-align:center">
        <span style="display:inline-block;background:#071525;color:#fff;font-family:ui-monospace,monospace;font-size:28px;font-weight:700;letter-spacing:0.12em;padding:16px 28px;border-radius:12px">
          ${escapeHtml(code)}
        </span>
      </p>
      ${ipLine}
      <p style="font-size:13px;color:#64748b">
        Ce code est valable ${expiresMinutes} minutes et ne peut être utilisé qu'une seule fois.
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:24px">
        Si vous n'avez pas tenté de vous connecter, ignorez cet email et prévenez un administrateur.
      </p>
      <p style="margin-top:32px;font-size:13px;color:#94a3b8">— ${escapeHtml(agencyName)}</p>
    </div>
  `;
}

async function sendLoginOtpEmail(params: {
  name: string;
  email: string;
  code: string;
  ipAddress?: string;
}): Promise<boolean> {
  const settings = await getCrmSettings();
  const agencyName = settings.branding.agencyName ?? "SD CREATIV";

  return sendEmail({
    to: params.email,
    subject: `[${agencyName}] Code de connexion CRM — ${params.code}`,
    html: buildLoginOtpEmailHtml({
      name: params.name,
      code: params.code,
      agencyName,
      expiresMinutes: LOGIN_OTP_EXPIRY_MINUTES,
      ipAddress: params.ipAddress,
    }),
  });
}

export async function issueLoginEmailOtp(params: {
  userId: string;
  email: string;
  name: string;
  ipAddress?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = generateLoginEmailOtp();
  const hash = hashLoginEmailOtp(code);
  const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60_000);

  const sent = await sendLoginOtpEmail({
    name: params.name,
    email: params.email,
    code,
    ipAddress: params.ipAddress,
  });

  if (!sent) {
    return { ok: false, error: "Envoi du code par email impossible. Réessayez ou contactez un administrateur." };
  }

  await withDb(async (query) => {
    await query(
      `UPDATE crm_users
       SET login_otp_hash = $2,
           login_otp_expires_at = $3,
           login_otp_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [params.userId, hash, expiresAt.toISOString()],
    );
  });

  return { ok: true };
}

export async function resendLoginEmailOtp(params: {
  userId: string;
  email: string;
  name: string;
  ipAddress?: string;
}): Promise<{ ok: true } | { ok: false; error: string; retryAfterSec?: number }> {
  const cooldown = await withDb(async (query) => {
    const { rows } = await query<{ login_otp_sent_at: string | null }>(
      `SELECT login_otp_sent_at FROM crm_users WHERE id = $1`,
      [params.userId],
    );
    return rows[0]?.login_otp_sent_at ?? null;
  });

  if (cooldown) {
    const elapsedSec = Math.floor((Date.now() - new Date(cooldown).getTime()) / 1000);
    const remaining = LOGIN_OTP_RESEND_COOLDOWN_SEC - elapsedSec;
    if (remaining > 0) {
      return {
        ok: false,
        error: `Attendez ${remaining} s avant de renvoyer un code.`,
        retryAfterSec: remaining,
      };
    }
  }

  return issueLoginEmailOtp(params);
}

export async function verifyLoginEmailOtp(userId: string, rawCode: string): Promise<boolean> {
  const code = normalizeLoginEmailOtp(rawCode);
  if (!code) return false;

  const hash = hashLoginEmailOtp(code);

  return withDb(async (query) => {
    const { rows } = await query<{
      login_otp_hash: string | null;
      login_otp_expires_at: string | null;
    }>(
      `SELECT login_otp_hash, login_otp_expires_at
       FROM crm_users
       WHERE id = $1`,
      [userId],
    );

    const row = rows[0];
    if (!row?.login_otp_hash || !row.login_otp_expires_at) return false;
    if (new Date(row.login_otp_expires_at).getTime() < Date.now()) return false;

    const stored = row.login_otp_hash;
    if (
      stored.length !== hash.length ||
      !timingSafeEqual(Buffer.from(stored), Buffer.from(hash))
    ) {
      return false;
    }

    await query(
      `UPDATE crm_users
       SET login_otp_hash = NULL,
           login_otp_expires_at = NULL,
           login_otp_sent_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    return true;
  });
}
