import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { processMarketingSequences } from "@/lib/marketing-sequences";

/** Cron — séquences email marketing sur leads. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await processMarketingSequences();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/cron/marketing-sequences] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
