import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { sendKadyWeeklyDigest } from "@/lib/kady-digest";

/** Cron hebdomadaire — bilan Nari (conversations, prospects, questions à améliorer). Bearer CRON_SECRET */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  try {
    return NextResponse.json(await sendKadyWeeklyDigest());
  } catch (error) {
    console.error("[api/cron/kady-digest] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
