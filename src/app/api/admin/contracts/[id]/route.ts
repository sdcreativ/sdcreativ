import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { ensureMaintenanceSubscription, ensureMaintenanceSubscriptionSafely } from "@/lib/maintenance-contracts";
import {
  ContractLockedError,
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
    let contract = await updateContract(id, parsed.data);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    // Signature enregistrée à la main (papier) : même automatisation que la signature électronique.
    if (parsed.data.status === "signed" || parsed.data.status === "linked") {
      await ensureMaintenanceSubscriptionSafely(id);
      contract = (await getContractById(id)) ?? contract;
    }
    return NextResponse.json({ contract });
  } catch (error) {
    if (error instanceof ContractLockedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
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
    if (body.action === "maintenance-subscription") {
      const result = await ensureMaintenanceSubscription(id);
      if (result.status === "skipped") {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }
      return NextResponse.json({ status: result.status, contract: result.contract });
    }
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
