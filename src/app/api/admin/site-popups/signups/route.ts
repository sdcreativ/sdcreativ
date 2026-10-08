import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { listPopupSignups } from "@/lib/site-popups";

/** Inscrits via les popups (données personnelles : droit de lecture des leads requis). */
export async function GET() {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  return NextResponse.json({ signups: await listPopupSignups(200) });
}
