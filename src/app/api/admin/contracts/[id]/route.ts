import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createContractAmendment,
  createAmendmentSchema,
  getContractById,
  listContractAmendments,
  updateContract,
  updateContractSchema,
} from "@/lib/contracts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    const amendments = await listContractAmendments(id);
    return NextResponse.json({ contract, amendments });
  } catch (error) {
    console.error("[api/admin/contracts/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const contract = await updateContract(id, parsed.data);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (error) {
    console.error("[api/admin/contracts/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action !== "amendment") {
      return NextResponse.json({ error: "Action non supportée." }, { status: 400 });
    }
    const parsed = createAmendmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const amendment = await createContractAmendment(id, parsed.data);
    return NextResponse.json({ amendment }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/contracts/[id]] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
