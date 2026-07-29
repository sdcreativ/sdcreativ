import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { updateInvitationLogByProviderMessageId } from "@/lib/calendar-invitation-logs";
import {
  isResendWebhookConfigured,
  mapResendEventToInvitationStatus,
  verifyResendWebhookBearer,
  verifyResendWebhookSignature,
  type ResendWebhookPayload,
} from "@/lib/resend-webhook";

/**
 * Webhook Resend (delivered / bounced / complained).
 * Auth : signature Svix (`whsec_…`) ou Bearer RESEND_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  if (!isResendWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook Resend non configuré (RESEND_WEBHOOK_SECRET)." },
      { status: 503 },
    );
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const rawBody = await request.text();
    const signed = verifyResendWebhookSignature(rawBody, {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    });
    const bearer = verifyResendWebhookBearer(request);
    if (!signed && !bearer) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    let payload: ResendWebhookPayload = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody) as ResendWebhookPayload;
      } catch {
        return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
      }
    }

    const type = payload.type ?? "";
    const status = mapResendEventToInvitationStatus(type);
    const messageId = payload.data?.email_id?.trim();

    if (!status || !messageId) {
      return NextResponse.json({ ok: true, ignored: true, type });
    }

    const error =
      status === "bounced"
        ? payload.data?.bounce?.message?.slice(0, 1000) ?? "Bounce Resend"
        : status === "complained"
          ? "Plainte spam (Resend)"
          : null;

    const updated = await updateInvitationLogByProviderMessageId({
      providerMessageId: messageId,
      status,
      error,
    });

    return NextResponse.json({
      ok: true,
      type,
      status,
      matched: Boolean(updated),
      logId: updated?.id ?? null,
    });
  } catch (error) {
    console.error("[api/webhooks/resend] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "resend-webhook",
    configured: isResendWebhookConfigured(),
    hint: "Configurer RESEND_WEBHOOK_SECRET (whsec_… Resend/Svix) puis pointer https://sdcreativ.com/api/webhooks/resend",
  });
}
