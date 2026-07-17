/**
 * Client Yousign API v3 (signature électronique eIDAS).
 * Env : YOUSIGN_API_KEY, YOUSIGN_API_BASE_URL (optionnel), YOUSIGN_WEBHOOK_SECRET.
 */

export type YousignConfig = {
  apiKey: string;
  baseUrl: string;
  webhookSecret: string | null;
};

export function getYousignConfig(): YousignConfig | null {
  const apiKey = process.env.YOUSIGN_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.YOUSIGN_API_BASE_URL ?? "https://api.yousign.app/v3").replace(/\/$/, ""),
    webhookSecret: process.env.YOUSIGN_WEBHOOK_SECRET?.trim() || null,
  };
}

export function isYousignConfigured(): boolean {
  return Boolean(getYousignConfig());
}

async function yousignFetch<T>(
  path: string,
  init: RequestInit & { formData?: FormData } = {},
): Promise<T> {
  const config = getYousignConfig();
  if (!config) throw new Error("Yousign non configuré (YOUSIGN_API_KEY manquant).");

  const { formData, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${config.apiKey}`);
  if (!formData && rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${config.baseUrl}${path}`, {
    ...rest,
    headers,
    body: formData ?? rest.body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Yousign ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type YousignSignatureRequest = {
  id: string;
  status: string;
};

export async function createYousignSignatureRequest(input: {
  name: string;
  deliveryMode?: "email" | "none";
}): Promise<YousignSignatureRequest> {
  return yousignFetch<YousignSignatureRequest>("/signature_requests", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.slice(0, 255),
      delivery_mode: input.deliveryMode ?? "email",
      timezone: "Europe/Paris",
    }),
  });
}

export async function uploadYousignDocument(input: {
  signatureRequestId: string;
  filename: string;
  pdfBuffer: Buffer;
}): Promise<{ id: string }> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.pdfBuffer)], { type: "application/pdf" }),
    input.filename,
  );
  form.append("nature", "signable_document");
  form.append("parse_anchors", "false");

  return yousignFetch<{ id: string }>(
    `/signature_requests/${input.signatureRequestId}/documents`,
    { method: "POST", formData: form },
  );
}

export async function addYousignSigner(input: {
  signatureRequestId: string;
  documentId: string;
  firstName: string;
  lastName: string;
  email: string;
}): Promise<{ id: string }> {
  return yousignFetch<{ id: string }>(
    `/signature_requests/${input.signatureRequestId}/signers`,
    {
      method: "POST",
      body: JSON.stringify({
        info: {
          first_name: input.firstName.slice(0, 80),
          last_name: input.lastName.slice(0, 80),
          email: input.email,
          locale: "fr",
        },
        signature_level: "electronic_signature",
        signature_authentication_mode: "otp_email",
        fields: [
          {
            document_id: input.documentId,
            type: "signature",
            page: 1,
            x: 60,
            y: 700,
            width: 200,
            height: 60,
          },
        ],
      }),
    },
  );
}

export async function activateYousignSignatureRequest(
  signatureRequestId: string,
): Promise<YousignSignatureRequest> {
  return yousignFetch<YousignSignatureRequest>(
    `/signature_requests/${signatureRequestId}/activate`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function verifyYousignWebhookSecret(headerValue: string | null): boolean {
  const config = getYousignConfig();
  if (!config?.webhookSecret) return true; // secret optionnel en sandbox
  if (!headerValue) return false;
  return headerValue === config.webhookSecret;
}
