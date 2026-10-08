import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getDocumentLetterhead } from "@/lib/billing/document-company";
import { htmlToPdfResponse } from "@/lib/server-pdf";
import { buildContractPdfHtml } from "@/lib/signature/contract-pdf";
import { getContractByNativeSignToken } from "@/lib/signature/native-contract";

type Props = { params: Promise<{ token: string }> };

/** Le client lit le contrat complet (clauses, prix, avantage) avant de le signer. */
export async function GET(_request: Request, { params }: Props) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }
  try {
    const { token } = await params;
    const contract = await getContractByNativeSignToken(token);
    if (!contract) {
      return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    return htmlToPdfResponse(
      buildContractPdfHtml(contract, siteUrl, undefined, await getDocumentLetterhead()),
      contract.reference,
    );
  } catch (error) {
    console.error("[api/espace-client/sign/contract/document] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
