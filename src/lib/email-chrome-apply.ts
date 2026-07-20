import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { getCrmSettings } from "@/lib/crm-settings";
import { wrapEmailHtml } from "@/lib/email-chrome";

/** Charge le branding CRM et enveloppe le HTML avant envoi Resend. */
export async function applyEmailChrome(bodyHtml: string): Promise<string> {
  try {
    const [company, settings] = await Promise.all([
      getInvoiceDocumentCompany(),
      getCrmSettings(),
    ]);
    return wrapEmailHtml(bodyHtml, company, settings.emailChrome);
  } catch (error) {
    console.error("[email-chrome] apply failed, sending without chrome", error);
    return bodyHtml;
  }
}
