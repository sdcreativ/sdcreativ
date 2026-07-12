import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createContract,
  createContractSchema,
  listContracts,
} from "@/lib/contracts";

export async function GET(request: Request) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId") ?? undefined;
    const contracts = await listContracts({ clientId });
    return NextResponse.json({ contracts });
  } catch (error) {
    console.error("[api/admin/contracts] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }
    const contract = await createContract(parsed.data);
    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/contracts] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
