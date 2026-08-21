import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getFacebookPageConnectionStatus } from "@/lib/facebook-page";

export async function GET() {
  const authError = await requireAdminAuth({
    anyPermission: ["settings.manage", "blog.read"],
  });
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const status = await getFacebookPageConnectionStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error("[api/admin/facebook/status] GET", error);
    return NextResponse.json({ error: "Impossible de lire le statut Facebook." }, { status: 500 });
  }
}
