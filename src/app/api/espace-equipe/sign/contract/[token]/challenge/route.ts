import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getEmployeeContractByNativeSignToken } from "@/lib/signature/native-employee-contract";
import { createSignatureOtpChallenge } from "@/lib/signature/otp";

type Props = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await params;
    const contract = await getEmployeeContractByNativeSignToken(token);
    if (!contract) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
    }
    const email = contract.esignSignerEmail?.trim();
    if (!email) {
      return NextResponse.json({ error: "Email signataire manquant." }, { status: 400 });
    }

    const result = await createSignatureOtpChallenge({
      entityType: "employee_contract",
      entityId: contract.id,
      email,
      documentLabel: `Contrat RH ${contract.reference}`,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      displayTo: result.displayTo,
      expiresInMinutes: result.expiresInMinutes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Envoi impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
