import { updateInvoice, type Invoice } from "@/lib/invoices";
import type { CinetPayCheckResult } from "@/lib/billing/cinetpay";

export async function applyCinetPayToInvoice(
  invoice: Invoice,
  check: CinetPayCheckResult,
  transactionId: string,
): Promise<Invoice | null> {
  if (check.status !== "ACCEPTED" || check.amount <= 0) {
    return null;
  }

  const previousMeta = invoice.metadata ?? {};
  const processed = previousMeta.cinetpayProcessedTransactions;
  const processedList = Array.isArray(processed) ? (processed as string[]) : [];
  if (processedList.includes(transactionId)) {
    return invoice;
  }

  const newPaid = Math.min(invoice.total, invoice.paidAmount + Math.round(check.amount));

  return updateInvoice(invoice.id, {
    paidAmount: newPaid,
    metadata: {
      ...previousMeta,
      cinetpayProcessedTransactions: [...processedList, transactionId],
      cinetpayLastPayment: {
        transactionId,
        amount: check.amount,
        method: check.paymentMethod ?? null,
        at: new Date().toISOString(),
      },
    },
  });
}
