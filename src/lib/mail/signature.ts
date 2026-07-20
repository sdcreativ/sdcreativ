import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { DEFAULT_CRM_BRANDING } from "@/lib/crm-settings-types";
import { MAIL_V1_SHARED_MAILBOX } from "@/lib/mail/config";

export type MailSignature = {
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Signature outbound Messagerie — logo + branding + contact site public.
 */
export async function buildMailSignature(): Promise<MailSignature> {
  const website =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://sdcreativ.com";

  let agencyName = DEFAULT_CRM_BRANDING.agencyName;
  let tagline = DEFAULT_CRM_BRANDING.tagline;
  let email = MAIL_V1_SHARED_MAILBOX;
  let phone = "";
  let address = "";
  let logoUrl = "";

  try {
    const company = await getInvoiceDocumentCompany(website);
    agencyName = company.agencyName || agencyName;
    tagline = company.tagline || tagline;
    email = company.email?.trim() || email;
    phone = company.phone?.trim() || "";
    address = company.address?.trim() || "";
    logoUrl = company.logoUrl || "";
  } catch {
    // fallback defaults
  }

  const textLines = [agencyName, tagline, email];
  if (phone) textLines.push(phone);
  if (address) textLines.push(address);
  textLines.push(website);

  const text = `\n\n--\n${textLines.join("\n")}`;

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(agencyName)}" width="120" style="display:block;max-width:120px;max-height:44px;width:auto;height:auto;border:0;margin:0 0 10px" />`
    : "";

  const detailLines = [agencyName, tagline, email];
  if (phone) detailLines.push(phone);
  if (address) detailLines.push(address);
  detailLines.push(website);

  const html = `<br/><br/><div style="margin:0;padding-top:12px;border-top:1px solid #e2e8f0;max-width:360px">
    ${logoHtml}
    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.45">${detailLines
      .map((l) => escapeHtml(l))
      .join("<br/>")}</p>
  </div>`;

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
