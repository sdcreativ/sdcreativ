import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getVendorPoByPortalToken,
  submitVendorPortalDeliverable,
} from "@/lib/vendor-portal";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await context.params;
    const po = await getVendorPoByPortalToken(token);
    if (!po) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
    }
    return NextResponse.json({ purchaseOrder: po });
  } catch (error) {
    console.error("[api/espace-prestataire] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

const deliverSchema = z.object({
  note: z.string().trim().min(4).max(4000),
});

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await context.params;
    const body = deliverSchema.parse(await request.json());
    const po = await submitVendorPortalDeliverable({
      token,
      note: body.note,
      markAccepted: true,
    });
    return NextResponse.json({ success: true, purchaseOrder: po });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    console.error("[api/espace-prestataire] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Dépôt impossible." },
      { status: 400 },
    );
  }
}
