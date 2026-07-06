import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processInvoicePaymentReminders } from "@/lib/invoice-reminders";
import { sendEmail } from "@/lib/email";

/** Cron externe — relances paiement factures. Header: Authorization: Bearer CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const result = await processInvoicePaymentReminders();

    if (result.sent > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      await sendEmail({
        subject: `[SD CREATIV CRM] ${result.sent} relance(s) facture envoyée(s)`,
        html: `<p>${result.sent} relance(s) de paiement ont été envoyées aux clients.</p>
               <p><a href="${siteUrl}/admin/crm/factures">Voir les factures</a></p>`,
      });
    }

    return NextResponse.json({
      ...result,
      message:
        result.sent > 0
          ? `${result.sent} relance(s) envoyée(s).`
          : "Aucune relance de paiement en attente.",
    });
  } catch (error) {
    console.error("[api/cron/invoice-payment-reminders] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
