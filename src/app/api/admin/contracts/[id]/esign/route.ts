import { NextResponse } from "next/server";
import { z } from "zod";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { sendContractForEsign } from "@/lib/esign/send-contract";
import { isYousignConfigured } from "@/lib/esign/yousign";

type Props = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  signerEmail: z.string().trim().email(),
  signerName: z.string().trim().max(160).optional().nullable(),
});

export async function POST(request: Request, { params }: Props) {
  const authError = await crmApiAuth.invoices.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  if (!isYousignConfigured()) {
    return NextResponse.json(
      {
        error:
          "Yousign non configuré. Ajoutez YOUSIGN_API_KEY (sandbox ou prod) pour activer la signature tierce.",
      },
      { status: 503 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const contract = await sendContractForEsign({
      contractId: id,
      signerEmail: parsed.data.signerEmail,
      signerName: parsed.data.signerName,
    });
    return NextResponse.json({ contract });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    console.error("[api/admin/contracts/esign] POST", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
