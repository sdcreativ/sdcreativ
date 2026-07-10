import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { generateInvoiceFromQuote } from "@/lib/billing/generate-invoice";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const session = await getAdminSession();
    let sendEmail = true;

    try {
      const body = await request.json();
      if (body && typeof body.sendEmail === "boolean") {
        sendEmail = body.sendEmail;
      }
    } catch {
      /* body optionnel */
    }

    const result = await generateInvoiceFromQuote({
      quoteId: id,
      actor: {
        type: "admin",
        id: session?.userId ?? null,
        name: session?.name ?? "Administrateur",
      },
      auditActor: session
        ? {
            userId: session.userId === "legacy" ? null : session.userId,
            name: session.name,
            email: session.email,
          }
        : undefined,
      sendEmail,
    });

    return NextResponse.json({
      success: true,
      invoice: result.invoice,
      quote: result.quote,
      documentId: result.documentId,
      emailSent: result.emailSent,
      alreadyExists: result.alreadyExists,
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/generate-invoice] POST", error);
    return NextResponse.json({ error: "Génération de facture impossible." }, { status: 500 });
  }
}
