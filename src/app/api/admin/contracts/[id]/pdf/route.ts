import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getContractById } from "@/lib/contracts";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { downloadObjectBuffer, isS3Configured } from "@/lib/s3";
import { getDocumentLetterhead } from "@/lib/billing/document-company";
import { htmlToPdfResponse } from "@/lib/server-pdf";
import { buildContractPdfHtml } from "@/lib/signature/contract-pdf";

type RouteContext = { params: Promise<{ id: string }> };

/** Contrat sur papier à en-tête : l'exemplaire signé archivé s'il existe, sinon le document à signer. */
export async function GET(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const contract = await getContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }
    const preferHtml = new URL(request.url).searchParams.get("format") === "html";

    const proofKey = await withDb(async (query) => {
      const { rows } = await query<{ proof_s3_key: string | null }>(
        `SELECT proof_s3_key FROM contract_signatures WHERE contract_id = $1`,
        [id],
      );
      return rows[0]?.proof_s3_key ?? null;
    });
    if (!preferHtml && proofKey && isS3Configured()) {
      try {
        const buffer = await downloadObjectBuffer(proofKey);
        if (buffer.subarray(0, 5).toString("utf8") === "%PDF-") {
          return new Response(new Uint8Array(buffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${contract.reference}-signe.pdf"`,
              "Cache-Control": "private, no-cache",
            },
          });
        }
      } catch (error) {
        console.warn("[api/admin/contracts/pdf] lecture de l'exemplaire signé impossible", error);
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    return htmlToPdfResponse(
      buildContractPdfHtml(contract, siteUrl, undefined, await getDocumentLetterhead()),
      contract.reference,
      { preferHtml },
    );
  } catch (error) {
    console.error("[api/admin/contracts/[id]/pdf] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
