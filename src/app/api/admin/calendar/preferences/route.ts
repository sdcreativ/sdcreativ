import { NextResponse } from "next/server";
import { getAdminSession, requireAdminAuth } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getCalendarReminderPreferences,
  updateCalendarReminderPreferences,
  updateCalendarReminderPrefsSchema,
} from "@/lib/calendar-user-preferences";
import { isTwilioConfigured } from "@/lib/sms";

export async function GET() {
  const authError = await crmApiAuth.calendar.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({
        preferences: {
          emailEnabled: true,
          smsEnabled: false,
          smsPhone: null,
          defaultLeadMinutes: 15,
          types: {},
        },
        twilioConfigured: isTwilioConfigured(),
      });
    }

    const preferences = await getCalendarReminderPreferences(session.userId);
    return NextResponse.json({ preferences, twilioConfigured: isTwilioConfigured() });
  } catch (error) {
    console.error("[api/admin/calendar/preferences] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = await crmApiAuth.calendar.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const session = await getAdminSession();
    if (!session?.userId || session.userId === "legacy") {
      return NextResponse.json({ error: "Compte CRM requis pour enregistrer les préférences." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateCalendarReminderPrefsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }

    const preferences = await updateCalendarReminderPreferences(session.userId, parsed.data);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("[api/admin/calendar/preferences] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
