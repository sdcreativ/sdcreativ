import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processQuoteAutoReminders } from "@/lib/quote-reminders";
import { sendEmail } from "@/lib/email";

/** Cron externe — relances automatiques devis. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await processQuoteAutoReminders();

    if (result.sent > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      await sendEmail({
        subject: `[SD CREATIV CRM] ${result.sent} relance(s) devis envoyée(s)`,
        html: `<p>${result.sent} relance(s) automatique(s) de devis ont été envoyées aux clients.</p>
               <p><a href="${siteUrl}/admin/crm/devis">Voir les devis</a></p>`,
      });
    }

    return NextResponse.json({
      ...result,
      message:
        result.sent > 0
          ? `${result.sent} relance(s) envoyée(s).`
          : "Aucune relance de devis en attente.",
    });
  } catch (error) {
    console.error("[api/cron/quote-follow-ups] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
