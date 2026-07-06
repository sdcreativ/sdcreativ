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
}): string {
  const { name, roleLabel, inviteUrl, agencyName, expiresHours } = params;
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px">
      <p>Bonjour <strong>${escapeHtml(name)}</strong>,</p>
      <p>
        Votre compte CRM <strong>${escapeHtml(agencyName)}</strong> a été créé avec le rôle
        <strong>${escapeHtml(roleLabel)}</strong>.
      </p>
      <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder au CRM :</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(inviteUrl)}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px">
          Activer mon compte
        </a>
      </p>
      <p style="font-size:13px;color:#64748b">
        Ce lien est valable ${expiresHours} heures. Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${escapeHtml(inviteUrl)}" style="color:#2563eb;word-break:break-all">${escapeHtml(inviteUrl)}</a>
      </p>
      <p style="font-size:13px;color:#64748b;margin-top:24px">
        Si vous n'attendiez pas cette invitation, ignorez cet email.
      </p>
      <p style="margin-top:32px;font-size:13px;color:#94a3b8">— ${escapeHtml(agencyName)}</p>
    </div>
  `;
}

export async function sendUserInvitationEmail(params: {
  name: string;
  email: string;
  roleLabel: string;
  inviteUrl: string;
}): Promise<boolean> {
  const settings = await getCrmSettings();
  const agencyName = settings.branding.agencyName ?? "SD CREATIV";

  return sendEmail({
    to: params.email,
    subject: `[${agencyName}] Activez votre accès CRM`,
    html: buildUserInvitationEmailHtml({
      name: params.name,
      roleLabel: params.roleLabel,
      inviteUrl: params.inviteUrl,
      agencyName,
      expiresHours: INVITE_EXPIRY_HOURS,
    }),
  });
}
