import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getEmployeeContractByNativeSignToken } from "@/lib/signature/native-employee-contract";
import { logSignatureEvent } from "@/lib/signature/events";
import { EMPLOYEE_CONTRACT_TYPE_LABELS } from "@/content/employee-contracts-labels";
import { formatMoney, type SupportedCurrency } from "@/lib/currencies";
import { EMPLOYEE_COMPENSATION_PERIOD_LABELS } from "@/content/employee-contracts-labels";

type Props = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await params;
    const contract = await getEmployeeContractByNativeSignToken(token);
    if (!contract) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
    }

    await logSignatureEvent({
      entityType: "employee_contract",
      entityId: contract.id,
      eventType: "native.link_opened",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
      payload: {},
    });

    const amountLabel =
      contract.compensationAmount != null
        ? `${formatMoney(
            contract.compensationAmount,
            contract.compensationCurrency as SupportedCurrency,
          )} / ${EMPLOYEE_COMPENSATION_PERIOD_LABELS[contract.compensationPeriod].toLowerCase()}`
        : null;

    return NextResponse.json({
      contract: {
        id: contract.id,
        reference: contract.reference,
        title: contract.title,
        employeeName: contract.userName,
        contractTypeLabel: EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType],
        jobTitle: contract.jobTitle,
        amountLabel,
        startDate: contract.startDate,
        endDate: contract.endDate,
        canSign:
          contract.status === "pending_signature" || contract.status === "draft",
        signerEmailHint: contract.esignSignerEmail
          ? contract.esignSignerEmail.replace(/(.{2}).+(@.+)/, "$1***$2")
          : null,
      },
    });
  } catch (error) {
    console.error("[api/espace-equipe/sign/contract] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
