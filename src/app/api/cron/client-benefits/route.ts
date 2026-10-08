import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processBenefitReminders } from "@/lib/client-benefits";

/** Cron quotidien — rappels des avantages promis (J-30) et alertes en fin de période. Bearer CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  try {
    return NextResponse.json(await processBenefitReminders());
  } catch (error) {
    console.error("[api/cron/client-benefits] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
