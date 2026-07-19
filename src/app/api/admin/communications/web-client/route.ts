import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getThreeCxWebClientUrl } from "@/lib/communications";

/** Expose l’URL Web Client 3CX (dérivée de l’env) pour le header CRM. */
export async function GET() {
  const denied = await requireAdminAuth({ permission: "communications.read" });
  if (denied) return denied;

  const url = getThreeCxWebClientUrl();
  return NextResponse.json({
    url,
    configured: Boolean(url),
  });
}
