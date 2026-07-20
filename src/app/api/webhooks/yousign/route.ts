import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { markContractSignedFromWebhook } from "@/lib/esign/send-contract";
import { markEmployeeContractSignedFromWebhook } from "@/lib/esign/send-employee-contract";
import { verifyYousignWebhookSecret } from "@/lib/esign/yousign";

/**
 * Webhook Yousign — événements signature_request.done / signer.done.
 * Header attendu : X-Yousign-Signature-Secret ou Authorization Bearer (selon config).
 */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  const secretHeader =
    request.headers.get("x-yousign-signature-secret") ??
    request.headers.get("x-ys-signature") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (!verifyYousignWebhookSecret(secretHeader)) {
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      event_name?: string;
      event_id?: string;
      data?: { signature_request?: { id?: string }; id?: string };
      signature_request?: { id?: string };
    };

    const eventType = payload.event_name ?? "unknown";
    const externalId =
      payload.data?.signature_request?.id ??
      payload.data?.id ??
      payload.signature_request?.id ??
      null;

    if (!externalId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const isDone =
      eventType.includes("done") ||
      eventType.includes("completed") ||
      eventType === "signature_request.done";

    if (!isDone) {
      return NextResponse.json({ ok: true, ignored: true, eventType });
    }

    const contract = await markContractSignedFromWebhook({
      externalId,
      eventType,
      payload,
    });

    if (contract) {
      return NextResponse.json({
        ok: true,
        contractId: contract.id,
        kind: "client_contract",
      });
    }

    const employeeContract = await markEmployeeContractSignedFromWebhook({
      externalId,
      eventType,
      payload,
    });

    return NextResponse.json({
      ok: true,
      contractId: employeeContract?.id ?? null,
      kind: employeeContract ? "employee_contract" : null,
    });
  } catch (error) {
    console.error("[webhooks/yousign] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
