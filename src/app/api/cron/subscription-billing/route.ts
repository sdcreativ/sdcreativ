import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processSubscriptionBilling } from "@/lib/subscriptions";
import { sendEmail } from "@/lib/email";

/** Cron — facturation récurrente des abonnements. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await processSubscriptionBilling();

    if (result.processed > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      await sendEmail({
        subject: `[SD CREATIV CRM] ${result.processed} facture(s) récurrente(s) à valider`,
        html: `<p>${result.processed} facture(s) d'abonnement ont été préparées <strong>en brouillon</strong> :
               ${result.invoicesCreated.join(", ")}.</p>
               ${result.benefitsApplied > 0 ? `<p>${result.benefitsApplied} facture(s) de maintenance incluent la remise d'un avantage promis.</p>` : ""}
               <p>Relisez-les puis envoyez-les au client : <a href="${siteUrl}/admin/crm/factures">voir les factures</a>.</p>`,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/cron/subscription-billing] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
