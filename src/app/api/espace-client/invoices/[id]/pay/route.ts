import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getInvoiceRemaining, updateInvoice } from "@/lib/invoices";
import { assertPortalInvoiceAccess } from "@/lib/billing/portal-access";
import {
  buildCinetPayTransactionId,
  getCinetPayNotifyUrl,
  getCinetPayReturnUrl,
  initCinetPayPayment,
} from "@/lib/billing/cinetpay";
import { getPaymentSettings, isCinetPayConfigured } from "@/lib/payment-settings";
import { BillingWorkflowError } from "@/lib/billing/workflow";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  if (!isCinetPayConfigured()) {
    return NextResponse.json({ error: "Paiement en ligne indisponible." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const invoice = await assertPortalInvoiceAccess(session.crmPortalId, id);

    const [paymentSettings, remaining] = await Promise.all([
      getPaymentSettings(),
      Promise.resolve(getInvoiceRemaining(invoice)),
    ]);

    if (!paymentSettings.onlineEnabled) {
      return NextResponse.json({ error: "Paiement en ligne désactivé." }, { status: 403 });
    }

    if (remaining <= 0) {
      return NextResponse.json({ error: "Cette facture est déjà réglée." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const transactionId = buildCinetPayTransactionId(invoice.id);

    await updateInvoice(invoice.id, {
      metadata: {
        cinetpayPending: {
          transactionId,
          amount: remaining,
          createdAt: new Date().toISOString(),
        },
      },
    });

    const result = await initCinetPayPayment({
      transactionId,
      amount: remaining,
      description: `Facture ${invoice.reference}`,
      customerName: invoice.name,
      customerEmail: invoice.email,
      notifyUrl: getCinetPayNotifyUrl(siteUrl),
      returnUrl: getCinetPayReturnUrl(siteUrl, invoice.id),
    });

    return NextResponse.json({
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      amount: remaining,
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[api/espace-client/invoices/[id]/pay] POST", error);
    const message =
      error instanceof Error ? error.message : "Impossible d'initialiser le paiement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
