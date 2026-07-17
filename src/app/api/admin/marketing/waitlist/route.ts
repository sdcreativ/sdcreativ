import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { deleteWaitlistEntry, listWaitlistEntries } from "@/lib/marketing-subscribers";

export async function GET() {
  const authError = await crmApiAuth.marketing.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const entries = await listWaitlistEntries();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/admin/marketing/waitlist] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = await crmApiAuth.marketing.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis." }, { status: 400 });
    }
    await deleteWaitlistEntry(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/marketing/waitlist] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
