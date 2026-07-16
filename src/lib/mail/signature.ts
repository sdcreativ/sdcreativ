import { getCrmSettings } from "@/lib/crm-settings";
import { DEFAULT_CRM_BRANDING } from "@/lib/crm-settings-types";
import { MAIL_V1_SHARED_MAILBOX } from "@/lib/mail/config";
import { getSitePublicSettings } from "@/lib/site-public-settings";

export type MailSignature = {
  text: string;
  html: string;
};

/**
 * Signature outbound Messagerie — branding CRM + contact site public.
 */
export async function buildMailSignature(): Promise<MailSignature> {
  let agencyName = DEFAULT_CRM_BRANDING.agencyName;
  let tagline = DEFAULT_CRM_BRANDING.tagline;
  let email = MAIL_V1_SHARED_MAILBOX;
  let phone = "";
  let website = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://sdcreativ.com";

  try {
    const [settings, site] = await Promise.all([
      getCrmSettings(),
      getSitePublicSettings(),
    ]);
    agencyName = settings.branding.agencyName || agencyName;
    tagline = settings.branding.tagline || site.tagline || tagline;
    email = site.contact.email?.trim() || email;
    phone = site.contact.phone?.trim() || "";
  } catch {
    // fallback defaults
  }

  const lines = [agencyName, tagline, email];
  if (phone) lines.push(phone);
  lines.push(website);

  const text = `\n\n--\n${lines.join("\n")}`;
  const html = `<br/><br/><p style="margin:0;color:#64748b;font-size:13px;line-height:1.45">${lines
    .map((l) => escapeHtml(l))
    .join("<br/>")}</p>`;

  return { text, html };
}

export function appendSignature(
  bodyText: string,
  bodyHtml: string | null | undefined,
  signature: MailSignature,
  includeSignature: boolean,
): { text: string; html: string } {
  const text = includeSignature
    ? `${bodyText.trimEnd()}${signature.text}`
    : bodyText.trimEnd();

  const htmlBody = bodyHtml?.trim()
    ? bodyHtml.trim()
    : `<p>${escapeHtml(bodyText).replace(/\n/g, "<br/>")}</p>`;

  const html = includeSignature
    ? `${htmlBody}${signature.html}`
    : htmlBody;

  return { text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
