import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { evaluateGoLiveChecklist, launchQuoteGoLive } from "@/lib/billing/go-live";
import { BillingWorkflowError } from "@/lib/billing/workflow";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const result = await evaluateGoLiveChecklist(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/go-live] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      createInvoice?: boolean;
      markDelivered?: boolean;
      sendInvoiceEmail?: boolean;
    };
    const session = await getAdminSession();
    const actor = {
      type: "admin" as const,
      id: session?.userId ?? null,
      name: session?.name ?? "Administrateur",
    };

    const result = await launchQuoteGoLive({
      quoteId: id,
      actor,
      auditActor: session
        ? {
            userId: session.userId === "legacy" ? null : session.userId,
            name: session.name,
            email: session.email,
          }
        : undefined,
      createInvoice: body.createInvoice,
      markDelivered: body.markDelivered,
      sendInvoiceEmail: body.sendInvoiceEmail,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/go-live] POST", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Go-live impossible." },
      { status: 400 },
    );
  }
}
