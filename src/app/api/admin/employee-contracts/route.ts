import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  EMPLOYEE_CONTRACT_STATUSES,
  EMPLOYEE_CONTRACT_TYPES,
} from "@/content/employee-contracts-labels";
import { archiveEmployeeContractToS3 } from "@/lib/employee-contract-archive";
import {
  createEmployeeContract,
  createEmployeeContractSchema,
  listEmployeeContracts,
} from "@/lib/employee-contracts";
import { isS3Configured } from "@/lib/s3";

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

    if (!isS3Configured()) {
      return NextResponse.json(
        {
          error:
            "Stockage S3 non configuré : les contrats doivent être archivés. Configurez AWS_S3_BUCKET et les clés AWS.",
        },
        { status: 503 },
      );
    }

    let contract = await createEmployeeContract(parsed.data, createdBy);
    try {
      contract = await archiveEmployeeContractToS3({
        contract,
        variant: "draft",
      });
    } catch (archiveError) {
      console.error("[api/admin/employee-contracts] archive S3", archiveError);
      return NextResponse.json(
        {
          error:
            archiveError instanceof Error
              ? archiveError.message
              : "Impossible d’archiver le contrat sur S3.",
        },
        { status: 502 },
      );
    }

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
