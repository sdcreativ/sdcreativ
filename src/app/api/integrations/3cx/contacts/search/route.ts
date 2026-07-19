import { NextResponse } from "next/server";
import { guardThreeCxIntegration, logThreeCxRequest } from "@/lib/threecx/auth";
import { searchThreeCxContacts } from "@/lib/threecx/contacts";
import { reportThreeCxError } from "@/lib/threecx/observability";

/**
 * GET /api/integrations/3cx/contacts/search?q=
 */
export async function GET(request: Request) {
  const denied = guardThreeCxIntegration(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("search") ?? "";
  const limit = Number(searchParams.get("limit") ?? "20");

  logThreeCxRequest("contacts/search", request, {
    qLen: q.trim().length,
  });

  if (q.trim().length < 2) {
    return NextResponse.json({ contacts: [] });
  }

  try {
    const contacts = await searchThreeCxContacts(q, limit);
    return NextResponse.json({ contacts });
  } catch (error) {
    reportThreeCxError("contacts/search", error, { qLen: q.trim().length });
    return NextResponse.json({ error: "Erreur recherche." }, { status: 500 });
  }
}
