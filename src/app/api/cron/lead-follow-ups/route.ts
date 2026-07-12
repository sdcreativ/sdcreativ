import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processLeadInactiveReminders } from "@/lib/lead-reminders";
import { sendEmail } from "@/lib/email";

/** Cron externe — relances leads inactifs. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await processLeadInactiveReminders();

    if (result.sent > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
      await sendEmail({
        subject: `[SD CREATIV CRM] ${result.sent} alerte(s) lead inactif`,
        html: `<p>${result.sent} alerte(s) de leads inactifs ont été envoyées à l'équipe.</p>
               <p><a href="${siteUrl}/admin/crm/leads">Voir les leads</a></p>`,
      });
    }

    return NextResponse.json({
      ...result,
      message:
        result.sent > 0
          ? `${result.sent} alerte(s) lead inactif envoyée(s).`
          : "Aucun lead inactif à relancer.",
    });
  } catch (error) {
    console.error("[api/cron/lead-follow-ups] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
