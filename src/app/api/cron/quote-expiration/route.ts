import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processQuoteExpirations } from "@/lib/billing/expire-quotes";
import { sendEmail } from "@/lib/email";

/** Cron externe — expiration automatique des devis. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await processQuoteExpirations();

    if (result.expired > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      await sendEmail({
        subject: `[SD CREATIV CRM] ${result.expired} devis expiré(s)`,
        html: `<p>${result.expired} devis ont été passés au statut « expiré » automatiquement.</p>
               <p><a href="${siteUrl}/admin/crm/devis">Voir les devis</a></p>`,
      });
    }

    return NextResponse.json({
      ...result,
      message:
        result.expired > 0
          ? `${result.expired} devis expiré(s).`
          : "Aucun devis à expirer.",
    });
  } catch (error) {
    console.error("[api/cron/quote-expiration] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
