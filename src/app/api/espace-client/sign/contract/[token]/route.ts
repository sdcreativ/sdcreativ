import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getContractByNativeSignToken } from "@/lib/signature/native-contract";
import { logSignatureEvent } from "@/lib/signature/events";
import { formatInvoiceAmount } from "@/content/invoices-labels";

type Props = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await params;
    const contract = await getContractByNativeSignToken(token);
    if (!contract) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 404 },
      );
    }

    await logSignatureEvent({
      entityType: "contract",
      entityId: contract.id,
      eventType: "native.link_opened",
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
      payload: {},
    });

    return NextResponse.json({
      contract: {
        id: contract.id,
        reference: contract.reference,
        title: contract.title,
        clientName: contract.clientName,
        amountLabel:
          contract.amount != null ? formatInvoiceAmount(contract.amount) : null,
        startDate: contract.startDate,
        endDate: contract.endDate,
        canSign: contract.status === "sent" || contract.status === "draft",
        signerEmailHint: contract.esignSignerEmail
          ? contract.esignSignerEmail.replace(/(.{2}).+(@.+)/, "$1***$2")
          : null,
      },
    });
  } catch (error) {
    console.error("[api/espace-client/sign/contract] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
