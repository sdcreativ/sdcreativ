import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  addClientInteraction,
  createInteractionSchema,
  getClientById,
  listClientInteractions,
} from "@/lib/clients";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Props) {
  const authError = await crmApiAuth.clients.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }

    const interactions = await listClientInteractions(id);
    return NextResponse.json({ interactions });
  } catch (error) {
    console.error("[api/admin/clients/interactions] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.clients.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createInteractionSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const interaction = await addClientInteraction(id, parsed.data);
    return NextResponse.json({ interaction }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/clients/interactions] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
