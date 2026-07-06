import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getInvoiceStats } from "@/lib/invoices";

export async function GET() {
  const authError = await requireAdminAuth();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const stats = await getInvoiceStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[api/admin/invoices/stats] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
