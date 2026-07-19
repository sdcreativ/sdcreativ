import { NextResponse } from "next/server";
import { guardThreeCxIntegration, logThreeCxRequest } from "@/lib/threecx/auth";
import { journalCallSchema, journalThreeCxCall } from "@/lib/threecx/journal";
import { reportThreeCxError } from "@/lib/threecx/observability";

/**
 * POST /api/integrations/3cx/journal/call — Call Journaling (idempotent via externalId).
 */
export async function POST(request: Request) {
  const denied = guardThreeCxIntegration(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = journalCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  logThreeCxRequest("journal/call", request, {
    hasExternalId: Boolean(parsed.data.externalId || parsed.data.callId),
    hasEntityId: Boolean(parsed.data.entityId),
  });

  try {
    const event = await journalThreeCxCall(parsed.data);
    if (!event) {
      return NextResponse.json(
        { error: "Journalisation impossible (base indisponible)." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: true, event, duplicate: event.duplicate },
      { status: event.duplicate ? 200 : 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur journal appel.";
    reportThreeCxError("journal/call", error, {
      hasExternalId: Boolean(parsed.data.externalId || parsed.data.callId),
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
