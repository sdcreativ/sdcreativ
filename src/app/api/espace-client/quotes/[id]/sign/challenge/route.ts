import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { assertPortalQuoteAccess, PORTAL_SIGNABLE_STATUSES } from "@/lib/billing/portal-access";
import { createSignatureOtpChallenge } from "@/lib/signature/otp";
import { BillingWorkflowError } from "@/lib/billing/workflow";

type RouteContext = { params: Promise<{ id: string }> };

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
    const quote = await assertPortalQuoteAccess(session.crmPortalId, id);
    if (!PORTAL_SIGNABLE_STATUSES.includes(quote.status)) {
      return NextResponse.json({ error: "Ce devis ne peut plus être signé." }, { status: 409 });
    }

    const email = quote.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Aucun email disponible pour envoyer le code." },
        { status: 400 },
      );
    }

    const result = await createSignatureOtpChallenge({
      entityType: "quote",
      entityId: quote.id,
      email,
      documentLabel: `Devis ${quote.reference}`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      displayTo: result.displayTo,
      expiresInMinutes: result.expiresInMinutes,
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Envoi du code impossible.";
    console.error("[api/espace-client/quotes/sign/challenge]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
