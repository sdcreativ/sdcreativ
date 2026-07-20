import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  EMPLOYEE_CONTRACT_STATUSES,
  EMPLOYEE_CONTRACT_TYPES,
} from "@/content/employee-contracts-labels";
import {
  createEmployeeContract,
  createEmployeeContractSchema,
  listEmployeeContracts,
} from "@/lib/employee-contracts";

export async function GET(request: Request) {
  const authError = await crmApiAuth.hr.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? undefined;
    const statusRaw = searchParams.get("status");
    const typeRaw = searchParams.get("contractType");
    const status = EMPLOYEE_CONTRACT_STATUSES.find((s) => s === statusRaw);
    const contractType = EMPLOYEE_CONTRACT_TYPES.find((t) => t === typeRaw);

    const contracts = await listEmployeeContracts({
      userId,
      status,
      contractType,
    });
    return NextResponse.json({ contracts });
  } catch (error) {
    console.error("[api/admin/employee-contracts] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.hr.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createEmployeeContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const session = await getAdminSession();
    const createdBy =
      session && session.userId !== "legacy" ? session.userId : null;

    const contract = await createEmployeeContract(parsed.data, createdBy);

    if (session) {
      await logCrmAudit({
        actor: {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        },
        action: "create",
        entityType: "employee_contract",
        entityId: contract.id,
        summary: `Contrat employé créé ${contract.reference} (${contract.contractType})`,
      });
    }

    return NextResponse.json({ contract }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/employee-contracts] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
