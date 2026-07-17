import { createHash, randomBytes } from "crypto";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getCrmSettings } from "@/lib/crm-settings";

export const INVITE_EXPIRY_HOURS = 72;

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getInvitationUrl(token: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl.replace(/\/$/, "")}/admin/invitation/${encodeURIComponent(token)}`;
}

export function buildUserInvitationEmailHtml(params: {
  name: string;
  roleLabel: string;
  inviteUrl: string;
  agencyName: string;
  expiresHours: number;
  proEmail: string;
  personalEmail: string;
  phone?: string | null;
  smsOtpEnabled?: boolean;
}): string {
  const {
    name,
    roleLabel,
    inviteUrl,
    agencyName,
    expiresHours,
    proEmail,
    personalEmail,
    phone,
    smsOtpEnabled,
  } = params;

  const smsLine =
    smsOtpEnabled && phone
      ? `<p style="margin:8px 0 0;font-size:13px;color:#0369a1">Codes 2FA aussi disponibles par SMS sur <strong>${escapeHtml(phone)}</strong>.</p>`
      : `<p style="margin:8px 0 0;font-size:13px;color:#0369a1">Les codes 2FA seront envoyés sur votre email personnel.</p>`;

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px">
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>
        Votre accès <strong>${escapeHtml(agencyName)}</strong> a été préparé avec le rôle
        <strong>${escapeHtml(roleLabel)}</strong>.
      </p>

      <div style="margin:24px 0;padding:16px 18px;border-radius:12px;background:#f0f9ff;border:1px solid #bae6fd">
        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0c4a6e">Vos identifiants CRM</p>
        <p style="margin:0 0 8px"><strong>Connexion :</strong> ${escapeHtml(proEmail)}</p>
        <p style="margin:0 0 8px"><strong>Email personnel (invitation &amp; 2FA) :</strong> ${escapeHtml(personalEmail)}</p>
        ${smsLine}
      </div>

      <p>Cliquez ci-dessous pour définir votre <strong>mot de passe CRM</strong> (première connexion) :</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(inviteUrl)}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px">
          Activer mon compte CRM
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">
        Ce lien est valable ${expiresHours} heures. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${escapeHtml(inviteUrl)}" style="color:#2563eb;word-break:break-all">${escapeHtml(inviteUrl)}</a>
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:24px">
        Après activation, connectez-vous avec <strong>${escapeHtml(proEmail)}</strong> et le mot de passe que vous aurez choisi.
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:16px">
        Si vous n'attendiez pas cette invitation, ignorez cet email.
      </p>
      <p style="margin-top:32px;font-size:13px;color:#94a3b8">— ${escapeHtml(agencyName)}</p>
    </div>
  `;
}

export async function sendUserInvitationEmail(params: {
  name: string;
  personalEmail: string;
  proEmail: string;
  roleLabel: string;
  inviteUrl: string;
  phone?: string | null;
  smsOtpEnabled?: boolean;
}): Promise<boolean> {
  const settings = await getCrmSettings();
  const agencyName = settings.branding.agencyName ?? "SD CREATIV";

  return sendEmail({
    to: params.personalEmail,
    subject: `[${agencyName}] Activez votre accès CRM`,
    html: buildUserInvitationEmailHtml({
      name: params.name,
      roleLabel: params.roleLabel,
      inviteUrl: params.inviteUrl,
      agencyName,
      expiresHours: INVITE_EXPIRY_HOURS,
      proEmail: params.proEmail,
      personalEmail: params.personalEmail,
      phone: params.phone,
      smsOtpEnabled: params.smsOtpEnabled,
    }),
  });
}
