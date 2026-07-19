import { NextResponse } from "next/server";
import { guardThreeCxIntegration, logThreeCxRequest } from "@/lib/threecx/auth";
import { lookupThreeCxContact } from "@/lib/threecx/contacts";
import { reportThreeCxError } from "@/lib/threecx/observability";

/**
 * GET /api/integrations/3cx/contacts/lookup?email=&phone=
 * Réponse stable pour template 3CX (ContactUrl, EntityId, Email, phones…).
 */
export async function GET(request: Request) {
  const denied = guardThreeCxIntegration(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const phone = searchParams.get("phone") ?? searchParams.get("number");

  logThreeCxRequest("contacts/lookup", request, {
    hasEmail: Boolean(email),
    hasPhone: Boolean(phone),
  });

  if (!email?.trim() && !phone?.trim()) {
    return NextResponse.json(
      { error: "Paramètre email ou phone requis.", contact: null },
      { status: 400 },
    );
  }

  try {
    const contact = await lookupThreeCxContact({ email, phone });
    return NextResponse.json({
      contact,
      contacts: contact ? [contact] : [],
    });
  } catch (error) {
    reportThreeCxError("contacts/lookup", error, {
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
    });
    return NextResponse.json({ error: "Erreur lookup." }, { status: 500 });
  }
}
