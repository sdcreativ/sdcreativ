import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { withDb } from "@/lib/db";
import {
  getEmployeeContractById,
  getEmployeeContractSignatureProof,
  type EmployeeContract,
} from "@/lib/employee-contracts";
import { isS3Configured, sanitizeFilename, uploadObjectBuffer } from "@/lib/s3";
import { buildEmployeeContractPdfHtml } from "@/lib/signature/employee-contract-pdf";

export type EmployeeContractArchiveVariant = "draft" | "signed";

export function buildEmployeeContractDocumentKey(
  contract: EmployeeContract,
  variant: EmployeeContractArchiveVariant,
  extension: string,
): string {
  const base =
    variant === "signed"
      ? `${sanitizeFilename(contract.reference)}-signe.${extension}`
      : `${sanitizeFilename(contract.reference)}.${extension}`;
  return `employee-contracts/${contract.userId}/${contract.id}/${base}`;
}

export function resolveArchiveVariant(
  contract: EmployeeContract,
): EmployeeContractArchiveVariant {
  if (
    contract.status === "signed" ||
    contract.status === "active" ||
    contract.status === "ended" ||
    Boolean(contract.signedAt)
  ) {
    return "signed";
  }
  return "draft";
}

async function persistDocumentPointers(input: {
  contractId: string;
  s3Key: string;
  documentName: string;
}): Promise<EmployeeContract> {
  await withDb(async (query) => {
    await query(
      `UPDATE employee_contracts SET
         document_s3_key = $2,
         document_name = $3,
         updated_at = NOW()
       WHERE id = $1`,
      [input.contractId, input.s3Key, input.documentName],
    );
  });
  const updated = await getEmployeeContractById(input.contractId);
  if (!updated) throw new Error("Contrat introuvable après archivage S3.");
  return updated;
}

/**
 * Génère le PDF du contrat et l’enregistre sur S3.
 * Met à jour `document_s3_key` / `document_name` pour lecture CRM.
 */
export async function archiveEmployeeContractToS3(input: {
  contract: EmployeeContract;
  variant?: EmployeeContractArchiveVariant;
  /** Buffer déjà rendu (ex. téléchargé depuis Yousign). */
  buffer?: Buffer;
  mimeType?: string;
  extension?: string;
  signature?: {
    signerName: string;
    signedAt: string;
    signatureHash: string;
    signatureDataUrl: string;
    documentSha256?: string;
  };
}): Promise<EmployeeContract> {
  if (!isS3Configured()) {
    throw new Error(
      "Stockage S3 non configuré : impossible d’archiver le contrat. Configurez AWS_S3_BUCKET et les clés AWS.",
    );
  }

  const variant = input.variant ?? resolveArchiveVariant(input.contract);
  let buffer = input.buffer;
  let mimeType = input.mimeType;
  let extension = input.extension;

  if (!buffer) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const company = await getInvoiceDocumentCompany(siteUrl);
    let signature = input.signature;
    if (!signature && variant === "signed") {
      const proof = await getEmployeeContractSignatureProof(input.contract.id);
      if (proof) {
        signature = {
          signerName: proof.signerName,
          signedAt: proof.signedAt,
          signatureHash: proof.signatureHash,
          signatureDataUrl: proof.signatureData,
          documentSha256: proof.documentSha256 ?? undefined,
        };
      }
    }
    const html = buildEmployeeContractPdfHtml(
      input.contract,
      siteUrl,
      signature,
      company,
    );
    const rendered = await renderHtmlToDocument(html);
    buffer = rendered.buffer;
    mimeType = rendered.mimeType;
    extension = rendered.extension;
  }

  const ext = (extension ?? (mimeType?.includes("pdf") ? "pdf" : "html")).replace(
    /^\./,
    "",
  );
  const s3Key = buildEmployeeContractDocumentKey(input.contract, variant, ext);
  const documentName = s3Key.split("/").pop() ?? `${input.contract.reference}.${ext}`;

  await uploadObjectBuffer(s3Key, buffer, mimeType ?? "application/pdf");

  return persistDocumentPointers({
    contractId: input.contract.id,
    s3Key,
    documentName,
  });
}

/**
 * Garantit qu’un contrat a un document S3.
 * - Si déjà archivé → inchangé
 * - Sinon → génère et archive
 * Ne réécrit pas un exemplaire « signé » déjà présent (sauf force).
 */
export async function ensureEmployeeContractArchived(
  contract: EmployeeContract,
  options?: { force?: boolean },
): Promise<EmployeeContract> {
  if (contract.documentS3Key && !options?.force) {
    return contract;
  }
  const variant = resolveArchiveVariant(contract);
  // Ne pas écraser un PDF scellé signé par un brouillon régénéré
  if (
    contract.documentS3Key &&
    variant === "signed" &&
    contract.documentS3Key.includes("-signe.") &&
    !options?.force
  ) {
    return contract;
  }
  return archiveEmployeeContractToS3({ contract, variant });
}

/** Réarchive après édition (brouillon / en attente uniquement). */
export async function rearchiveEditableEmployeeContract(
  contract: EmployeeContract,
): Promise<EmployeeContract> {
  if (["signed", "active", "ended", "cancelled"].includes(contract.status)) {
    return contract;
  }
  return archiveEmployeeContractToS3({ contract, variant: "draft" });
}
