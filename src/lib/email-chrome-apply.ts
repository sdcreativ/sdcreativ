import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { getCrmSettings } from "@/lib/crm-settings";
import { wrapEmailHtml } from "@/lib/email-chrome";
import {
  EMAIL_LOGO_CONTENT_ID,
  prepareEmailLogo,
  type EmailInlineAttachment,
} from "@/lib/email-logo";

export type ApplyEmailChromeResult = {
  html: string;
  inlineAttachments: EmailInlineAttachment[];
};

/** Charge le branding CRM et enveloppe le HTML avant envoi Resend. */
export async function applyEmailChrome(bodyHtml: string): Promise<ApplyEmailChromeResult> {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const [company, settings, logo] = await Promise.all([
      getInvoiceDocumentCompany(siteUrl),
      getCrmSettings(),
      prepareEmailLogo(siteUrl),
    ]);

    // Évite un double logo si le corps (template) embarque déjà le CID
    const chrome = bodyHtml.includes(`cid:${EMAIL_LOGO_CONTENT_ID}`)
      ? { ...settings.emailChrome, showLogo: false }
      : settings.emailChrome;

    const html = wrapEmailHtml(
      bodyHtml,
      { ...company, logoUrl: logo.src },
      chrome,
    );

    return {
      html,
      inlineAttachments: logo.attachment ? [logo.attachment] : [],
    };
  } catch (error) {
    console.error("[email-chrome] apply failed, sending without chrome", error);
    return { html: bodyHtml, inlineAttachments: [] };
  }
}
