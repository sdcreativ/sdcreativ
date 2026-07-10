import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { signPortalQuote } from "@/lib/billing/sign-quote";
import { BillingWorkflowError } from "@/lib/billing/workflow";

type RouteContext = { params: Promise<{ id: string }> };

const signSchema = z.object({
  signerName: z.string().trim().min(2).max(160),
  signatureData: z.string().min(32).max(500_000),
  acceptTerms: z.literal(true),
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
    const body = await request.json();
    const parsed = signSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const quote = await signPortalQuote({
      portalClientId: session.clientId,
      quoteId: id,
      signerName: parsed.data.signerName,
      signatureData: parsed.data.signatureData,
      acceptTerms: parsed.data.acceptTerms,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        reference: quote.reference,
        status: quote.status,
        signedAt: quote.signedAt,
      },
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/espace-client/quotes/sign] POST", error);
    return NextResponse.json({ error: "Signature impossible." }, { status: 500 });
  }
}
