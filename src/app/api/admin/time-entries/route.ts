import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createTimeEntry,
  createTimeEntrySchema,
  getProjectTimeSummaries,
  listTimeEntries,
} from "@/lib/time-entries";

export async function GET(request: Request) {
  const authError = await crmApiAuth.timesheets.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    if (view === "summary") {
      const summaries = await getProjectTimeSummaries();
      return NextResponse.json({ summaries });
    }

    const entries = await listTimeEntries({
      projectId: searchParams.get("projectId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/admin/time-entries] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.timesheets.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const entry = await createTimeEntry(parsed.data);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/time-entries] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
