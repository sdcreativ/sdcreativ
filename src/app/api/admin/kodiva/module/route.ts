import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { fetchKodivaModuleSnapshot } from "@/lib/kodiva-module";

export async function GET() {
  const authError = await crmApiAuth.kodiva.read();
  if (authError) return authError;

  try {
    const snapshot = await fetchKodivaModuleSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("[api/admin/kodiva/module] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
