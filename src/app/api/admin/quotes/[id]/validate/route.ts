import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { validateQuote } from "@/lib/billing/validate-quote";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const session = await getAdminSession();

    const result = await validateQuote({
      quoteId: id,
      actor: {
        type: "admin",
        id: session?.userId ?? null,
        name: session?.name ?? "Administrateur",
      },
      validatedByUserId: session?.userId === "legacy" ? null : session?.userId,
      auditActor: session
        ? {
            userId: session.userId === "legacy" ? null : session.userId,
            name: session.name,
            email: session.email,
          }
        : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/validate] POST", error);
    return NextResponse.json({ error: "Validation impossible." }, { status: 500 });
  }
}
