import { getAdminSession } from "@/lib/admin-auth";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { logCrmAudit } from "@/lib/crm-audit";
import {
  deleteEmployeeContract,
  getEmployeeContractById,
  updateEmployeeContract,
  updateEmployeeContractSchema,
} from "@/lib/employee-contracts";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.hr.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const contract = await getEmployeeContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    return NextResponse.json({ contract });
  } catch (error) {
    console.error("[api/admin/employee-contracts/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authError = await crmApiAuth.hr.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeContractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const contract = await updateEmployeeContract(id, parsed.data);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }

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
        entityId: contract.id,
        summary: `Contrat employé mis à jour ${contract.reference} → ${contract.status}`,
      });
    }

    return NextResponse.json({ contract });
  } catch (error) {
    console.error("[api/admin/employee-contracts/[id]] PATCH", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const authError = await crmApiAuth.hr.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const existing = await getEmployeeContractById(id);
    if (!existing) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    if (existing.status === "active") {
      return NextResponse.json(
        { error: "Impossible de supprimer un contrat actif. Terminez-le d'abord." },
        { status: 409 },
      );
    }

    const ok = await deleteEmployeeContract(id);
    if (!ok) {
      return NextResponse.json({ error: "Suppression impossible." }, { status: 500 });
    }

    const session = await getAdminSession();
    if (session) {
      await logCrmAudit({
        actor: {
          userId: session.userId === "legacy" ? null : session.userId,
          name: session.name,
          email: session.email,
        },
        action: "delete",
        entityType: "employee_contract",
        entityId: id,
        summary: `Contrat employé supprimé ${existing.reference}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/employee-contracts/[id]] DELETE", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
