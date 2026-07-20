import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { archiveEmployeeContractToS3 } from "@/lib/employee-contract-archive";
import {
  getEmployeeContractById,
  type EmployeeContract,
} from "@/lib/employee-contracts";
import { withDb } from "@/lib/db";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import {
  activateYousignSignatureRequest,
  addYousignSigner,
  createYousignSignatureRequest,
  downloadYousignSignedDocuments,
  isYousignConfigured,
  uploadYousignDocument,
} from "@/lib/esign/yousign";
import { buildEmployeeContractPdfHtml } from "@/lib/signature/employee-contract-pdf";
import { EMPLOYEE_CONTRACT_TYPE_LABELS } from "@/content/employee-contracts-labels";

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Signataire", lastName: "Collaborateur" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "—" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function sendEmployeeContractForEsign(input: {
  contractId: string;
  signerEmail: string;
  signerName?: string | null;
}): Promise<EmployeeContract> {
  if (!isYousignConfigured()) {
    throw new Error(
      "Signature tierce indisponible : configurez YOUSIGN_API_KEY (et optionnellement YOUSIGN_API_BASE_URL).",
    );
  }

  const contract = await getEmployeeContractById(input.contractId);
  if (!contract) throw new Error("Contrat introuvable.");
  if (["signed", "active", "ended", "cancelled"].includes(contract.status)) {
    throw new Error("Ce contrat n'est plus signable.");
  }
  if (contract.signatureProvider === "native" && contract.esignSentAt) {
    throw new Error(
      "Une signature SD CREATIV est déjà en cours. Attendez la signature ou créez un nouveau contrat.",
    );
  }

  const email = input.signerEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email signataire invalide.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const company = await getInvoiceDocumentCompany(siteUrl);
  const html = buildEmployeeContractPdfHtml(contract, siteUrl, undefined, company);
  const doc = await renderHtmlToDocument(html);
  if (doc.mimeType !== "application/pdf") {
    throw new Error(
      "Impossible de générer le PDF contrat (Chromium indisponible). Définissez CHROMIUM_EXECUTABLE_PATH.",
    );
  }

  // Archive S3 du PDF envoyé à la signature
  await archiveEmployeeContractToS3({
    contract,
    variant: "draft",
    buffer: doc.buffer,
    mimeType: doc.mimeType,
    extension: doc.extension,
  });

  const typeLabel = EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType];
  const request = await createYousignSignatureRequest({
    name: `${contract.reference} — ${typeLabel} — ${contract.title}`,
  });
  const document = await uploadYousignDocument({
    signatureRequestId: request.id,
    filename: `${contract.reference}.pdf`,
    pdfBuffer: doc.buffer,
  });

  const { firstName, lastName } = splitName(
    input.signerName?.trim() || contract.userName || "Collaborateur",
  );
  await addYousignSigner({
    signatureRequestId: request.id,
    documentId: document.id,
    firstName,
    lastName,
    email,
  });
  await activateYousignSignatureRequest(request.id);

  return withDb(async (query) => {
    await query(
      `UPDATE employee_contracts SET
        status = 'pending_signature',
        sent_at = COALESCE(sent_at, NOW()),
        signature_provider = 'yousign',
        esign_external_id = $2,
        esign_document_id = $3,
        esign_signer_email = $4,
        esign_sent_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [contract.id, request.id, document.id, email],
    );
    await query(
      `INSERT INTO employee_contract_signature_events (contract_id, provider, event_type, external_id, payload)
       VALUES ($1, 'yousign', 'signature_request.activated', $2, $3::jsonb)`,
      [
        contract.id,
        request.id,
        JSON.stringify({ documentId: document.id, signerEmail: email }),
      ],
    );
    const updated = await getEmployeeContractById(contract.id);
    return updated!;
  });
}

export async function markEmployeeContractSignedFromWebhook(input: {
  externalId: string;
  eventType: string;
  payload: unknown;
}): Promise<EmployeeContract | null> {
  const contractId = await withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM employee_contracts WHERE esign_external_id = $1 LIMIT 1`,
      [input.externalId],
    );
    return rows[0]?.id ?? null;
  });
  if (!contractId) return null;

  await withDb(async (query) => {
    await query(
      `UPDATE employee_contracts SET
        status = 'signed',
        signed_at = COALESCE(signed_at, NOW()),
        esign_completed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [contractId],
    );
    await query(
      `INSERT INTO employee_contract_signature_events (contract_id, provider, event_type, external_id, payload)
       VALUES ($1, 'yousign', $2, $3, $4::jsonb)`,
      [
        contractId,
        input.eventType.slice(0, 80),
        input.externalId,
        JSON.stringify(input.payload ?? {}),
      ],
    );
  });

  const contract = await getEmployeeContractById(contractId);
  if (!contract) return null;

  // Archive l’exemplaire signé Yousign dans S3 pour consultation CRM
  try {
    const signedPdf = await downloadYousignSignedDocuments(input.externalId);
    return await archiveEmployeeContractToS3({
      contract,
      variant: "signed",
      buffer: signedPdf,
      mimeType: "application/pdf",
      extension: "pdf",
    });
  } catch (error) {
    console.warn(
      "[send-employee-contract] téléchargement Yousign impossible, archive locale :",
      error,
    );
    return archiveEmployeeContractToS3({ contract, variant: "signed" });
  }
}
