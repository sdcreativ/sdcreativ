import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  beginTotpSetup,
  buildTotpAuthUrl,
  buildTotpQrCodeUrl,
  disableTotp,
  enableTotp,
  getTotpSecret,
  getTotpStatus,
} from "@/lib/crm-totp";

export async function GET() {
  const authError = await crmApiAuth.settings.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({ error: "Compte CRM requis pour la 2FA." }, { status: 400 });
    }

    const status = await getTotpStatus(session.userId);
    return NextResponse.json({ status });
  } catch (error) {
    console.error("[api/admin/settings/2fa] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({ error: "Compte CRM requis pour la 2FA." }, { status: 400 });
    }

    const body = (await request.json()) as { action?: string; code?: string; password?: string };
    const action = body.action;

    if (action === "setup") {
      const current = await getTotpStatus(session.userId);
      if (current.enabled) {
        return NextResponse.json({ error: "La 2FA est déjà activée." }, { status: 400 });
      }

      const setup = await beginTotpSetup(session.userId, session.email);
      return NextResponse.json({ setup });
    }

    if (action === "enable") {
      if (!body.code) {
        return NextResponse.json({ error: "Code TOTP requis." }, { status: 400 });
      }

      const ok = await enableTotp(session.userId, body.code);
      if (!ok) {
        return NextResponse.json({ error: "Code invalide." }, { status: 400 });
      }

      return NextResponse.json({ success: true, status: await getTotpStatus(session.userId) });
    }

    if (action === "disable") {
      if (!body.code || !body.password) {
        return NextResponse.json({ error: "Mot de passe et code TOTP requis." }, { status: 400 });
      }

      const { verifyCrmUserPassword } = await import("@/lib/crm-users");
      const passwordOk = await verifyCrmUserPassword(session.userId, body.password);
      if (!passwordOk) {
        return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
      }

      const ok = await disableTotp(session.userId, body.code);
      if (!ok) {
        return NextResponse.json({ error: "Code TOTP invalide." }, { status: 400 });
      }

      return NextResponse.json({ success: true, status: await getTotpStatus(session.userId) });
    }

    if (action === "resume") {
      const secret = await getTotpSecret(session.userId);
      if (!secret) {
        return NextResponse.json({ error: "Configuration 2FA introuvable." }, { status: 404 });
      }

      const otpauthUrl = buildTotpAuthUrl(session.email, secret);
      return NextResponse.json({
        setup: { secret, otpauthUrl, qrCodeUrl: buildTotpQrCodeUrl(otpauthUrl) },
      });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    console.error("[api/admin/settings/2fa] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
