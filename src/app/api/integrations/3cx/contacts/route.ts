import { NextResponse } from "next/server";
import { z } from "zod";
import { guardThreeCxIntegration, logThreeCxRequest } from "@/lib/threecx/auth";
import { createThreeCxContact } from "@/lib/threecx/contacts";
import { reportThreeCxError } from "@/lib/threecx/observability";
import { LEAD_SOURCES } from "@/lib/leads";

const createSchema = z.object({
  firstName: z.string().trim().max(80).optional().nullable(),
  lastName: z.string().trim().max(80).optional().nullable(),
  companyName: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().max(255).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  number: z.string().trim().max(50).optional().nullable(),
  source: z.enum(LEAD_SOURCES).optional(),
});

/**
 * POST /api/integrations/3cx/contacts — création lead si aucun match.
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const phone = parsed.data.phone || parsed.data.number;
  logThreeCxRequest("contacts/create", request, {
    hasEmail: Boolean(parsed.data.email),
    hasPhone: Boolean(phone),
  });

  if (!parsed.data.email?.trim() && !phone?.trim() && !parsed.data.firstName?.trim()) {
    return NextResponse.json(
      { error: "Au moins email, téléphone ou prénom requis." },
      { status: 400 },
    );
  }

  try {
    const contact = await createThreeCxContact({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      companyName: parsed.data.companyName,
      email: parsed.data.email,
      phone,
      source: parsed.data.source ?? "live_chat_3cx",
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Création impossible (base indisponible)." },
        { status: 503 },
      );
    }

    return NextResponse.json({ contact, contacts: [contact] }, { status: 201 });
  } catch (error) {
    reportThreeCxError("contacts/create", error, {
      hasEmail: Boolean(parsed.data.email),
      hasPhone: Boolean(phone),
    });
    return NextResponse.json({ error: "Erreur création." }, { status: 500 });
  }
}
