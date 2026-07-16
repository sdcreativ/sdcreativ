import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getHostingerMailWebhookSecret,
  isHostingerMailWebhookConfigured,
} from "@/lib/mail/config";
import {
  handleHostingerMailWebhook,
  verifyHostingerMailWebhookAuth,
} from "@/lib/mail/webhook";
import type { HostingerMailWebhookPayload } from "@/lib/mail/webhook-payload";

/**
 * Webhook Hostinger Agentic Mail — message.received.
 * Auth : Authorization: Bearer HOSTINGER_MAIL_WEBHOOK_SECRET
 *
 * Déclenche une sync IMAP incrémentale (last_uid) de la boîte concernée.
 * Le cron /api/cron/mail-sync reste le fallback si le webhook est down.
 */
export async function POST(request: Request) {
  if (!isHostingerMailWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook messagerie non configuré (HOSTINGER_MAIL_WEBHOOK_SECRET)." },
      { status: 503 },
    );
  }

  if (!verifyHostingerMailWebhookAuth(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    let body: HostingerMailWebhookPayload = {};
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as HostingerMailWebhookPayload;
    } else {
      const text = await request.text();
      if (text.trim()) {
        try {
          body = JSON.parse(text) as HostingerMailWebhookPayload;
        } catch {
          body = {};
        }
      }
    }

    const result = await handleHostingerMailWebhook(body);

    // Toujours 200 pour les deliveries Hostinger (évite retries agressifs sur ignore/debounce)
    return NextResponse.json({
      ok: result.ok,
      ignored: result.ignored ?? false,
      mailboxEmail: result.mailboxEmail,
      inserted: result.sync?.inserted ?? 0,
      fetched: result.sync?.fetched ?? 0,
      message: result.reason ?? "OK",
    });
  } catch (error) {
    console.error("[api/webhooks/hostinger-mail] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

/** Health / ping (sans secret) — confirme que la route existe. */
export async function GET() {
  const configured = isHostingerMailWebhookConfigured();
  return NextResponse.json({
    service: "hostinger-mail-webhook",
    configured,
    secretLength: configured ? getHostingerMailWebhookSecret().length : 0,
    hint: configured
      ? "POST avec Authorization: Bearer HOSTINGER_MAIL_WEBHOOK_SECRET"
      : "Définir HOSTINGER_MAIL_WEBHOOK_SECRET (≥16 car.) puis créer le webhook dans hPanel Agentic Mail.",
  });
}
