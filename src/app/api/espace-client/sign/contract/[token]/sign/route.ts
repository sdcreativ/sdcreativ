import { NextResponse } from "next/server";
import { z } from "zod";
import { isDatabaseConfigured } from "@/lib/db";
import { signContractNative } from "@/lib/signature/native-contract";

type Props = { params: Promise<{ token: string }> };

const signSchema = z.object({
  signerName: z.string().trim().min(2).max(160),
  signatureData: z.string().min(32).max(500_000),
  otpCode: z.string().trim().min(4).max(32),
  acceptTerms: z.literal(true),
});

export async function POST(request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  try {
    const { token } = await params;
    const body = await request.json();
    const parsed = signSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Données invalides." },
        { status: 400 },
      );
    }

    const contract = await signContractNative({
      token,
      signerName: parsed.data.signerName,
      signatureData: parsed.data.signatureData,
      otpCode: parsed.data.otpCode,
      acceptTerms: parsed.data.acceptTerms,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        reference: contract.reference,
        status: contract.status,
        signedAt: contract.signedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signature impossible.";
    console.error("[api/espace-client/sign/contract/sign]", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
