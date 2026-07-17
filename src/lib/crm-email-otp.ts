import { createHash, randomInt, timingSafeEqual } from "crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getCrmSettings } from "@/lib/crm-settings";
import { withDb } from "@/lib/db";
import { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";
import { isValidPhone, maskPhone, normalizePhone, sendSms } from "@/lib/sms";

export { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";

export const LOGIN_OTP_EXPIRY_MINUTES = 10;
export const LOGIN_OTP_RESEND_COOLDOWN_SEC = 60;

export type LoginOtpChannel = "personal" | "professional" | "sms";

export type LoginOtpDestination = {
  to: string;
  /** Affichage public (email ou téléphone masqué). */
  displayTo: string;
  channel: LoginOtpChannel;
};

export type LoginOtpUserContext = {
  professionalEmail: string;
  personalEmail?: string | null;
  phone?: string | null;
  smsOtpEnabled?: boolean;
};

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

/** Préfère l’email personnel ; sinon email pro (comptes legacy). */
export function resolveLoginOtpEmailDestination(input: {
  professionalEmail: string;
  personalEmail?: string | null;
}): LoginOtpDestination {
  const personal = input.personalEmail?.trim().toLowerCase() || null;
  const professional = input.professionalEmail.trim().toLowerCase();
  if (personal && personal.includes("@") && personal !== professional) {
    return { to: personal, displayTo: personal, channel: "personal" };
  }
  return { to: professional, displayTo: professional, channel: "professional" };
}

/** @deprecated utiliser resolveLoginOtpEmailDestination */
export function resolveLoginOtpDestination(input: {
  professionalEmail: string;
  personalEmail?: string | null;
}): LoginOtpDestination {
  return resolveLoginOtpEmailDestination(input);
}

export function canSendLoginOtpSms(input: {
  phone?: string | null;
  smsOtpEnabled?: boolean;
}): boolean {
  return Boolean(input.smsOtpEnabled && input.phone && isValidPhone(input.phone));
}

export async function lookupLoginOtpUserContext(
  userId: string,
): Promise<LoginOtpUserContext | null> {
  return withDb(async (query) => {
    const { rows } = await query<{
      email: string;
      personal_email: string | null;
      phone: string | null;
      sms_otp_enabled: boolean;
    }>(
      `SELECT email, personal_email, phone, sms_otp_enabled
       FROM crm_users WHERE id = $1 LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    if (!row?.email) return null;
    return {
      professionalEmail: row.email,
      personalEmail: row.personal_email,
      phone: row.phone,
      smsOtpEnabled: row.sms_otp_enabled,
    };
  });
}

export async function lookupLoginOtpDestination(
  userId: string,
): Promise<LoginOtpDestination | null> {
  const ctx = await lookupLoginOtpUserContext(userId);
  if (!ctx) return null;
  return resolveLoginOtpEmailDestination({
    professionalEmail: ctx.professionalEmail,
    personalEmail: ctx.personalEmail,
  });
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

async function persistLoginOtp(userId: string, hash: string, expiresAt: Date): Promise<void> {
  await withDb(async (query) => {
    await query(
      `UPDATE crm_users
       SET login_otp_hash = $2,
           login_otp_expires_at = $3,
           login_otp_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [userId, hash, expiresAt.toISOString()],
    );
  });
}

export async function issueLoginEmailOtp(params: {
  userId: string;
  email: string;
  name: string;
  personalEmail?: string | null;
  ipAddress?: string;
  /** "email" (défaut) ou "sms" si activé sur le compte. */
  preferredChannel?: "email" | "sms";
}): Promise<
  | {
      ok: true;
      sentTo: string;
      channel: LoginOtpChannel;
      smsAvailable: boolean;
      maskedPhone?: string;
    }
  | { ok: false; error: string }
> {
  const ctx =
    (await lookupLoginOtpUserContext(params.userId)) ??
    ({
      professionalEmail: params.email,
      personalEmail: params.personalEmail,
      phone: null,
      smsOtpEnabled: false,
    } satisfies LoginOtpUserContext);

  const smsAvailable = canSendLoginOtpSms(ctx);
  const wantSms = params.preferredChannel === "sms";

  if (wantSms && !smsAvailable) {
    return {
      ok: false,
      error:
        "SMS indisponible — activez le code SMS et renseignez un téléphone valide dans votre profil.",
    };
  }

  const code = generateLoginEmailOtp();
  const hash = hashLoginEmailOtp(code);
  const expiresAt = new Date(Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60_000);

  if (wantSms && smsAvailable && ctx.phone) {
    const phone = normalizePhone(ctx.phone);
    const settings = await getCrmSettings();
    const agencyName = settings.branding.agencyName ?? "SD CREATIV";
    const sent = await sendSms(
      phone,
      `${agencyName} : code CRM ${code} (valable ${LOGIN_OTP_EXPIRY_MINUTES} min). Ne le partagez pas.`,
    );
    if (!sent) {
      return { ok: false, error: "Envoi du code par SMS impossible. Réessayez par email." };
    }
    await persistLoginOtp(params.userId, hash, expiresAt);
    return {
      ok: true,
      sentTo: maskPhone(phone),
      channel: "sms",
      smsAvailable: true,
      maskedPhone: maskPhone(phone),
    };
  }

  const destination = resolveLoginOtpEmailDestination({
    professionalEmail: ctx.professionalEmail,
    personalEmail: ctx.personalEmail,
  });

  const sent = await sendLoginOtpEmail({
    name: params.name,
    email: destination.to,
    code,
    ipAddress: params.ipAddress,
  });

  if (!sent) {
    return {
      ok: false,
      error: "Envoi du code par email impossible. Réessayez ou contactez un administrateur.",
    };
  }

  await persistLoginOtp(params.userId, hash, expiresAt);

  return {
    ok: true,
    sentTo: destination.displayTo,
    channel: destination.channel,
    smsAvailable,
    maskedPhone: smsAvailable && ctx.phone ? maskPhone(ctx.phone) : undefined,
  };
}

export async function resendLoginEmailOtp(params: {
  userId: string;
  email: string;
  name: string;
  personalEmail?: string | null;
  ipAddress?: string;
  preferredChannel?: "email" | "sms";
}): Promise<
  | {
      ok: true;
      sentTo: string;
      channel: LoginOtpChannel;
      smsAvailable: boolean;
      maskedPhone?: string;
    }
  | { ok: false; error: string; retryAfterSec?: number }
> {
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

  const ctx = await lookupLoginOtpUserContext(params.userId);
  if (!ctx) {
    return { ok: false, error: "Utilisateur introuvable." };
  }

  return issueLoginEmailOtp({
    userId: params.userId,
    email: params.email,
    name: params.name,
    personalEmail: ctx.personalEmail,
    ipAddress: params.ipAddress,
    preferredChannel: params.preferredChannel,
  });
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
