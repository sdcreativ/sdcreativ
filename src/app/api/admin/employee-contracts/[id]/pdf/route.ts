import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { isDatabaseConfigured } from "@/lib/db";
import { ensureEmployeeContractArchived } from "@/lib/employee-contract-archive";
import {
  getEmployeeContractById,
  getEmployeeContractSignatureProof,
} from "@/lib/employee-contracts";
import { downloadObjectBuffer, isS3Configured } from "@/lib/s3";
import { htmlToPdfResponse } from "@/lib/server-pdf";
import { buildEmployeeContractPdfHtml } from "@/lib/signature/employee-contract-pdf";

type RouteContext = { params: Promise<{ id: string }> };

function guessMimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.hr.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    let contract = await getEmployeeContractById(id);
    if (!contract) {
      return NextResponse.json({ error: "Contrat introuvable." }, { status: 404 });
    }

    const url = new URL(request.url);
    const preferHtml = url.searchParams.get("format") === "html";
    const autoPrint = url.searchParams.get("print") === "1";

    // Garantit l’archive S3 (création rétroactive pour anciens contrats)
    if (isS3Configured() && !contract.documentS3Key) {
      try {
        contract = await ensureEmployeeContractArchived(contract);
      } catch (error) {
        console.warn("[api/admin/employee-contracts/pdf] archivage S3 :", error);
      }
    }

    const sealedKey = contract.documentS3Key;
    const filenameBase = (
      contract.documentName?.replace(/\.[^.]+$/, "") || contract.reference
    ).replace(/[^\w.\-]+/g, "_");

    // Source de vérité : fichier S3
    if (!preferHtml && sealedKey && isS3Configured()) {
      try {
        const buffer = await downloadObjectBuffer(sealedKey);
        const mime = guessMimeFromKey(sealedKey);
        const ext = mime.includes("pdf") ? "pdf" : mime.includes("html") ? "html" : "bin";
        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `inline; filename="${filenameBase}.${ext}"`,
            "Cache-Control": "private, no-cache",
          },
        });
      } catch (error) {
        console.warn(
          "[api/admin/employee-contracts/pdf] Lecture S3 impossible, régénération :",
          error,
        );
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const company = await getInvoiceDocumentCompany(siteUrl);
    const proof = await getEmployeeContractSignatureProof(id);
    const signature = proof
      ? {
          signerName: proof.signerName,
          signedAt: proof.signedAt,
          signatureHash: proof.signatureHash,
          signatureDataUrl: proof.signatureData,
          documentSha256: proof.documentSha256 ?? undefined,
        }
      : undefined;

    let html = buildEmployeeContractPdfHtml(contract, siteUrl, signature, company);
    if (preferHtml) {
      const toolbar = `
<style>
  .crm-print-bar{position:sticky;top:0;z-index:20;display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:10px 12px;margin:-8px -8px 16px;background:rgba(248,250,252,.96);border-bottom:1px solid #e2e8f0;font-family:system-ui,sans-serif}
  .crm-print-bar button{border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer}
  .crm-print-bar button.primary{background:#1e40af;border-color:#1e40af;color:#fff}
  @media print{.crm-print-bar{display:none!important}}
</style>
<div class="crm-print-bar">
  <button type="button" onclick="window.print()" class="primary">Imprimer</button>
  <button type="button" onclick="window.close()">Fermer</button>
</div>`;
      html = html.replace("<body>", `<body>${toolbar}`);
      if (autoPrint) {
        html = html.replace(
          "</body>",
          `<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},250)});</script></body>`,
        );
      }
    }
    return htmlToPdfResponse(html, filenameBase, { preferHtml });
  } catch (error) {
    console.error("[api/admin/employee-contracts/[id]/pdf] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
