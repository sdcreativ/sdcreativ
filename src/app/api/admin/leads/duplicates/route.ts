import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { findDuplicateLeadGroups } from "@/lib/leads";

export async function GET() {
  const authError = await crmApiAuth.leads.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const groups = await findDuplicateLeadGroups();
    return NextResponse.json({ groups, count: groups.length });
  } catch (error) {
    console.error("[api/admin/leads/duplicates] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
