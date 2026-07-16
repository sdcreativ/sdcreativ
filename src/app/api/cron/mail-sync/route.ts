import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { isMailSyncEnabled } from "@/lib/mail/config";
import { syncAllActiveMailboxes } from "@/lib/mail/sync";

/**
 * Cron externe — sync IMAP messagerie Hostinger.
 * Header: Authorization: Bearer CRON_SECRET
 * Intervalle recommandé : toutes les 2 à 5 minutes.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  if (!isMailSyncEnabled()) {
    return NextResponse.json({
      enabled: false,
      message: "MAIL_SYNC_ENABLED désactivé — sync ignorée.",
    });
  }

  try {
    const result = await syncAllActiveMailboxes();
    const inserted = result.results.reduce((sum, r) => sum + r.inserted, 0);
    const errors = result.results.filter((r) => r.error).length;

    return NextResponse.json({
      ...result,
      inserted,
      errors,
      message:
        result.mailboxes === 0
          ? "Aucune boîte active à synchroniser."
          : `Sync terminée : ${inserted} message(s) importé(s), ${errors} erreur(s).`,
    });
  } catch (error) {
    console.error("[api/cron/mail-sync] GET", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 },
    );
  }
}
