import { NextResponse } from "next/server";
import { syncAllCalendarOAuthConnections } from "@/lib/calendar-sync";
import { isDatabaseConfigured } from "@/lib/db";

/** Cron externe — pull bidirectionnel Google / Microsoft pour toutes les connexions OAuth. */
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
    const result = await syncAllCalendarOAuthConnections();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/cron/calendar-sync] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
