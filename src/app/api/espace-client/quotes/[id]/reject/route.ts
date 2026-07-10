import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import { isDatabaseConfigured } from "@/lib/db";
import { rejectPortalQuote } from "@/lib/billing/reject-quote";
import { BillingWorkflowError } from "@/lib/billing/workflow";

type RouteContext = { params: Promise<{ id: string }> };

const rejectSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const profile = await buildClientProfileAsync(session.clientId);
    const body = await request.json();
    const parsed = rejectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const quote = await rejectPortalQuote({
      portalClientId: session.clientId,
      quoteId: id,
      reason: parsed.data.reason,
      actorName: profile.name,
    });

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        reference: quote.reference,
        status: quote.status,
        rejectionReason: quote.rejectionReason,
      },
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/espace-client/quotes/reject] POST", error);
    return NextResponse.json({ error: "Refus impossible." }, { status: 500 });
  }
}
