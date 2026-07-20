import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  archiveEmployeeContractToS3,
  resolveArchiveVariant,
} from "@/lib/employee-contract-archive";
import { getEmployeeContractById } from "@/lib/employee-contracts";
import { isS3Configured } from "@/lib/s3";

type Params = { params: Promise<{ id: string }> };

/** Force (re)archivage S3 du contrat — utile pour les dossiers anciens. */
export async function POST(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.hr.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Stockage S3 non configuré." },
      { status: 503 },
    );
  }

  try {
    const { id } = await params;
    const contract = await getEmployeeContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }

    const archived = await archiveEmployeeContractToS3({
      contract,
      variant: resolveArchiveVariant(contract),
    });

    const session = await getAdminSession();
    if (session) {
      await logCrmAudit({
        actor: {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        },
        action: "update",
        entityType: "employee_contract",
        entityId: archived.id,
        summary: `Contrat employé archivé S3 ${archived.reference}`,
      });
    }

    return NextResponse.json({ contract: archived });
  } catch (error) {
    console.error("[api/admin/employee-contracts/[id]/archive] POST", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur lors de l’archivage S3.",
      },
      { status: 502 },
    );
  }
}
