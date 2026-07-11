import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import { getAdminSession } from "@/lib/admin-auth";
import {
  getPaymentSettings,
  isCinetPayConfigured,
  updatePaymentSettings,
  updatePaymentSettingsSchema,
} from "@/lib/payment-settings";

export async function GET() {
  const authError = await crmApiAuth.settingsAccess();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({
      settings,
      cinetPayConfigured: isCinetPayConfigured(),
    });
  } catch (error) {
    console.error("[api/admin/settings/payment] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.settings.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = updatePaymentSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const settings = await updatePaymentSettings(parsed.data);

    const session = await getAdminSession();
    if (session) {
      await logCrmAudit({
        actor: {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        },
        action: "update",
        entityType: "payment_settings",
        summary: "Coordonnées de paiement mises à jour",
      });
    }

    return NextResponse.json({
      settings,
      cinetPayConfigured: isCinetPayConfigured(),
    });
  } catch (error) {
    console.error("[api/admin/settings/payment] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
