import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getNextProjectCalendarEvent } from "@/lib/calendar";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.projects.read();
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const event = await getNextProjectCalendarEvent(id);
    return NextResponse.json({ event });
  } catch (error) {
    console.error("[api/admin/projects/next-event] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
