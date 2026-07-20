import {
  DEFAULT_CRM_EMAIL_CHROME,
  type CrmEmailChrome,
} from "@/lib/crm-settings-types";

/** Champs société nécessaires au chrome email (aligné sur InvoiceDocumentCompany). */
export type EmailChromeCompany = {
  agencyName: string;
  tagline: string;
  primaryColor: string;
  logoUrl: string;
  siteUrl: string;
  phone: string;
  email: string;
  address: string;
  rccm: string;
  ncc: string;
};

export const EMAIL_CHROME_MARKER = "<!--sdc-email-chrome-->";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contactLine(
  company: EmailChromeCompany,
  chrome: CrmEmailChrome,
): string {
  const parts: string[] = [];
  if (chrome.showAddress && company.address.trim()) {
    parts.push(escapeHtml(company.address.trim()));
  }
  if (chrome.showPhone && company.phone.trim()) {
    const phone = company.phone.trim();
    parts.push(
      `<a href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}" style="color:#64748b;text-decoration:none">${escapeHtml(phone)}</a>`,
    );
  }
  if (chrome.showEmail && company.email.trim()) {
    const email = company.email.trim();
    parts.push(
      `<a href="mailto:${escapeHtml(email)}" style="color:#64748b;text-decoration:none">${escapeHtml(email)}</a>`,
    );
  }
  return parts.join(' <span style="color:#cbd5e1">·</span> ');
}

function legalLine(company: EmailChromeCompany, chrome: CrmEmailChrome): string {
  if (!chrome.showLegal) return "";
  const parts: string[] = [];
  if (company.rccm.trim()) parts.push(`RCCM ${escapeHtml(company.rccm.trim())}`);
  if (company.ncc.trim()) parts.push(`NCC ${escapeHtml(company.ncc.trim())}`);
  return parts.join(" · ");
}

/**
 * Enveloppe HTML email-safe : logo + identité en tête, coordonnées en pied.
 * Réutilise le merge Site public / Branding CRM (même source que les PDF).
 */
export function wrapEmailHtml(
  bodyHtml: string,
  company: EmailChromeCompany,
  chrome: CrmEmailChrome = DEFAULT_CRM_EMAIL_CHROME,
): string {
  if (!chrome.enabled) return bodyHtml;
  if (bodyHtml.includes(EMAIL_CHROME_MARKER)) return bodyHtml;

  const accent = company.primaryColor || "#1e40af";
  const siteHref = company.siteUrl.replace(/\/$/, "");

  const logoBlock =
    chrome.showLogo && company.logoUrl
      ? `<img src="${escapeHtml(company.logoUrl)}" alt="${escapeHtml(company.agencyName)}" width="148" style="display:block;max-width:148px;max-height:52px;width:auto;height:auto;border:0;outline:none" />`
      : `<span style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0f172a">${escapeHtml(company.agencyName)}</span>`;

  const taglineBlock =
    chrome.showTagline && company.tagline.trim()
      ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.4;color:#64748b">${escapeHtml(company.tagline.trim())}</p>`
      : "";

  const contacts = contactLine(company, chrome);
  const legal = legalLine(company, chrome);
  const note = chrome.footerNote.trim()
    ? `<p style="margin:10px 0 0;font-size:12px;line-height:1.45;color:#94a3b8">${escapeHtml(chrome.footerNote.trim())}</p>`
    : "";
  const website =
    chrome.showWebsite && siteHref
      ? `<p style="margin:10px 0 0;font-size:12px">
          <a href="${escapeHtml(siteHref)}" style="color:${escapeHtml(accent)};text-decoration:none;font-weight:600">${escapeHtml(siteHref.replace(/^https?:\/\//, ""))}</a>
        </p>`
      : "";

  return `${EMAIL_CHROME_MARKER}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0;padding:0;background:#f1f5f9">
  <tr>
    <td align="center" style="padding:28px 16px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr>
          <td style="padding:0;background:${escapeHtml(accent)};height:4px;font-size:0;line-height:0">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 28px 20px;border-bottom:1px solid #f1f5f9">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="vertical-align:middle">
                  ${logoBlock}
                  ${chrome.showLogo ? `<p style="margin:10px 0 0;font-size:15px;font-weight:700;color:#0f172a;letter-spacing:-0.01em">${escapeHtml(company.agencyName)}</p>` : ""}
                  ${taglineBlock}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.65;color:#0f172a">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
            <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a">${escapeHtml(company.agencyName)}</p>
            ${contacts ? `<p style="margin:8px 0 0;font-size:12px;line-height:1.55;color:#64748b">${contacts}</p>` : ""}
            ${legal ? `<p style="margin:8px 0 0;font-size:11px;line-height:1.45;color:#94a3b8">${legal}</p>` : ""}
            ${note}
            ${website}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
