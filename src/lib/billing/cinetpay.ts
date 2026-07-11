import { createHash } from "node:crypto";

const CINETPAY_API = "https://api-checkout.cinetpay.com/v2";

export type CinetPayInitInput = {
  transactionId: string;
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  notifyUrl: string;
  returnUrl: string;
};

export type CinetPayInitResult = {
  paymentUrl: string;
  transactionId: string;
};

export type CinetPayCheckResult = {
  status: "ACCEPTED" | "REFUSED" | "PENDING" | "UNKNOWN";
  amount: number;
  paymentMethod?: string;
};

function getCredentials(): { apiKey: string; siteId: string } {
  const apiKey = process.env.CINETPAY_API_KEY?.trim();
  const siteId = process.env.CINETPAY_SITE_ID?.trim();
  if (!apiKey || !siteId) {
    throw new Error("CinetPay non configuré (CINETPAY_API_KEY / CINETPAY_SITE_ID).");
  }
  return { apiKey, siteId };
}

export function buildCinetPayTransactionId(invoiceId: string): string {
  const suffix = createHash("sha256")
    .update(`${invoiceId}-${Date.now()}-${Math.random()}`)
    .digest("hex")
    .slice(0, 12);
  return `inv-${invoiceId.slice(0, 8)}-${suffix}`;
}

export async function initCinetPayPayment(input: CinetPayInitInput): Promise<CinetPayInitResult> {
  const { apiKey, siteId } = getCredentials();

  const res = await fetch(`${CINETPAY_API}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: input.transactionId,
      amount: Math.round(input.amount),
      currency: "XOF",
      description: input.description.slice(0, 200),
      notify_url: input.notifyUrl,
      return_url: input.returnUrl,
      channels: "ALL",
      customer_name: input.customerName.slice(0, 80),
      customer_email: input.customerEmail.slice(0, 120),
    }),
  });

  const json = (await res.json()) as {
    code?: string;
    message?: string;
    data?: { payment_url?: string };
  };

  if (!res.ok || json.code !== "201" || !json.data?.payment_url) {
    throw new Error(json.message ?? "Impossible d'initialiser le paiement CinetPay.");
  }

  return { paymentUrl: json.data.payment_url, transactionId: input.transactionId };
}

export async function checkCinetPayTransaction(transactionId: string): Promise<CinetPayCheckResult> {
  const { apiKey, siteId } = getCredentials();

  const res = await fetch(`${CINETPAY_API}/payment/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: transactionId,
    }),
  });

  const json = (await res.json()) as {
    code?: string;
    data?: {
      status?: string;
      amount?: number;
      payment_method?: string;
    };
  };

  const statusRaw = json.data?.status?.toUpperCase() ?? "UNKNOWN";
  const status =
    statusRaw === "ACCEPTED" || statusRaw === "REFUSED" || statusRaw === "PENDING"
      ? statusRaw
      : "UNKNOWN";

  return {
    status,
    amount: Number(json.data?.amount ?? 0),
    paymentMethod: json.data?.payment_method,
  };
}

export function getCinetPayNotifyUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/api/webhooks/cinetpay`;
}

export function getCinetPayReturnUrl(siteUrl: string, invoiceId: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/espace-client?section=invoices&invoice=${invoiceId}&payment=return`;
}
