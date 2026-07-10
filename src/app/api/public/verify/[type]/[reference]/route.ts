import { NextResponse } from "next/server";
import { verifyPublicDocument } from "@/lib/billing/verify-document";
import type { VerifyDocumentType } from "@/lib/billing/verify-token";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ type: string; reference: string }> };

const TYPE_MAP: Record<string, VerifyDocumentType> = {
  devis: "quote",
  facture: "invoice",
};

export async function GET(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { type, reference } = await context.params;
    const mapped = TYPE_MAP[type];
    if (!mapped) {
      return NextResponse.json({ error: "Type de document inconnu." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get("t");

    const result = await verifyPublicDocument({
      type: mapped,
      reference: decodeURIComponent(reference),
      token,
    });

    return NextResponse.json(result, { status: result.valid ? 200 : 403 });
  } catch (error) {
    console.error("[api/public/verify] GET", error);
    return NextResponse.json({ error: "Vérification impossible." }, { status: 500 });
  }
}
