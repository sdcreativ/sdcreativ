import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { getAdminSession } from "@/lib/admin-auth";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import { publishQuote } from "@/lib/billing/publish";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  sendEmail: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const session = await getAdminSession();
    const rawBody = request.headers.get("content-length") === "0" ? {} : await request.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const result = await publishQuote({
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
      sendEmail: parsed.data.sendEmail,
    });

    return NextResponse.json({
      success: true,
      quote: result.quote,
      documentId: result.documentId,
      emailSent: result.emailSent,
      portalClientId: result.portalClientId,
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/admin/quotes/publish] POST", error);
    return NextResponse.json({ error: "Publication impossible." }, { status: 500 });
  }
}
