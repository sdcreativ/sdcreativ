import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getMailPhase1Validation } from "@/lib/mail/validation";

/** Checklist validation Phase 1 Messagerie (lecture seule contact@). */
export async function GET() {
  const authError = await requireAdminAuth({ permission: "mail.read" });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const validation = await getMailPhase1Validation();
    return NextResponse.json({ validation });
  } catch (error) {
    console.error("[api/admin/mail/validation] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
