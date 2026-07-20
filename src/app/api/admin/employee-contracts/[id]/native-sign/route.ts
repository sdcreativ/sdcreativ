import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { sendEmployeeContractForNativeSignature } from "@/lib/signature/native-employee-contract";

type Props = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  signerEmail: z.string().trim().email().optional().nullable(),
});

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.hr.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const result = await sendEmployeeContractForNativeSignature({
      contractId: id,
      signerEmail: parsed.data.signerEmail,
    });
    return NextResponse.json({
      contract: result.contract,
      signUrl: result.signUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/employee-contracts/native-sign] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
