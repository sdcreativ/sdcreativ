import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { runHostingCatalogSync } from "@/lib/hostinger-catalog-sync";

/** Cron externe quotidien — relevé des prix Hostinger. Header: Authorization: Bearer CRON_SECRET */
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
    const result = await runHostingCatalogSync();
    return NextResponse.json({
      ...result,
      message: result.changes.length ? `${result.changes.length} prix en attente de validation.` : "Prix inchangés.",
    });
  } catch (error) {
    console.error("[api/cron/hostinger-catalog] GET", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur." }, { status: 500 });
  }
}
