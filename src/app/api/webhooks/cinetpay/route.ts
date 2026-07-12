import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { applyCinetPayToInvoice } from "@/lib/billing/apply-cinetpay-payment";
import { checkCinetPayTransaction } from "@/lib/billing/cinetpay";
import { logBillingEvent } from "@/lib/billing/events";
import { createPortalBillingNotification } from "@/lib/billing/notifications";
import { getClientById } from "@/lib/clients";
import { getInvoiceByCinetPayTransactionId } from "@/lib/invoices";
import { formatInvoiceAmount } from "@/content/invoices-labels";

async function readTransactionId(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    const id =
      body.transaction_id ??
      body.cpm_trans_id ??
      body.transactionId ??
      body.trans_id;
    return typeof id === "string" && id.trim() ? id.trim() : null;
  }

  const form = await request.formData();
  const id =
    form.get("cpm_trans_id") ??
    form.get("transaction_id") ??
    form.get("trans_id");
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** Webhook CinetPay — confirmation de paiement (notify_url). */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const transactionId = await readTransactionId(request);
    if (!transactionId) {
      return NextResponse.json({ error: "transaction_id requis." }, { status: 400 });
    }

    const invoice = await getInvoiceByCinetPayTransactionId(transactionId);
    if (!invoice) {
      console.warn("[api/webhooks/cinetpay] facture introuvable pour", transactionId);
      return NextResponse.json({ ok: true });
    }

    const check = await checkCinetPayTransaction(transactionId);
    if (check.status !== "ACCEPTED") {
      return NextResponse.json({ ok: true, status: check.status });
    }

    const updated = await applyCinetPayToInvoice(invoice, check, transactionId);
    if (!updated || updated.paidAmount === invoice.paidAmount) {
      return NextResponse.json({ ok: true });
    }

    await logBillingEvent({
      entityType: "invoice",
      entityId: invoice.id,
      action: "invoice.payment.cinetpay",
      actor: { type: "system", name: "CinetPay" },
      fromStatus: invoice.status,
      toStatus: updated.status,
      summary: `Paiement CinetPay reçu pour ${invoice.reference} (${formatInvoiceAmount(check.amount)}).`,
      metadata: {
        transactionId,
        amount: check.amount,
        method: check.paymentMethod ?? null,
      },
    });

    const client = invoice.clientId ? await getClientById(invoice.clientId) : null;
    if (client?.portalClientId) {
      void createPortalBillingNotification({
        portalClientId: client.portalClientId,
        eventType: "invoice.paid",
        title: `Paiement reçu — ${invoice.reference}`,
        message: `Votre paiement de ${formatInvoiceAmount(check.amount)} a été enregistré.`,
        linkHref: "/espace-client?section=invoices",
        entityType: "invoice",
        entityId: invoice.id,
      });
    }

    if (updated.status === "paid" && invoice.status !== "paid") {
      void import("@/lib/crm-webhooks").then(({ dispatchCrmWebhook }) =>
        dispatchCrmWebhook("invoice.paid", {
          invoiceId: updated.id,
          reference: updated.reference,
          amount: updated.total,
          paidAmount: updated.paidAmount,
          currency: updated.currency,
        }),
      );
    }

    return NextResponse.json({ ok: true, invoiceId: invoice.id });
  } catch (error) {
    console.error("[api/webhooks/cinetpay] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
