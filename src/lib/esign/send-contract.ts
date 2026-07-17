import { getContractById, type Contract } from "@/lib/contracts";
import { withDb } from "@/lib/db";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import {
  activateYousignSignatureRequest,
  addYousignSigner,
  createYousignSignatureRequest,
  isYousignConfigured,
  uploadYousignDocument,
} from "@/lib/esign/yousign";
import { formatInvoiceAmount } from "@/content/invoices-labels";

function buildContractPdfHtml(contract: Contract, siteUrl: string): string {
  const amount =
    contract.amount != null ? formatInvoiceAmount(contract.amount) : "—";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><title>${escapeHtml(contract.reference)}</title>
<style>
  body{font-family:Georgia,serif;color:#111;margin:40px;line-height:1.5}
  h1{font-size:22px;margin:0 0 8px}
  .meta{color:#555;font-size:13px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  td{padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px}
  td:first-child{color:#666;width:40%}
  .footer{margin-top:48px;font-size:11px;color:#888}
</style></head>
<body>
  <h1>${escapeHtml(contract.title)}</h1>
  <p class="meta">${escapeHtml(contract.reference)} · ${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))}</p>
  <table>
    <tr><td>Client</td><td>${escapeHtml(contract.clientName ?? "—")}</td></tr>
    <tr><td>Projet</td><td>${escapeHtml(contract.projectName ?? "—")}</td></tr>
    <tr><td>Montant</td><td>${escapeHtml(amount)}</td></tr>
    <tr><td>Début</td><td>${escapeHtml(contract.startDate ?? "—")}</td></tr>
    <tr><td>Fin</td><td>${escapeHtml(contract.endDate ?? "—")}</td></tr>
  </table>
  ${contract.notes ? `<p style="margin-top:24px">${escapeHtml(contract.notes)}</p>` : ""}
  <p class="footer">Document généré pour signature électronique — SD CREATIV</p>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Signataire", lastName: "Client" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "—" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export async function sendContractForEsign(input: {
  contractId: string;
  signerEmail: string;
  signerName?: string | null;
}): Promise<Contract> {
  if (!isYousignConfigured()) {
    throw new Error(
      "Signature tierce indisponible : configurez YOUSIGN_API_KEY (et optionnellement YOUSIGN_API_BASE_URL).",
    );
  }

  const contract = await getContractById(input.contractId);
  if (!contract) throw new Error("Contrat introuvable.");
  if (contract.status === "signed" || contract.status === "linked") {
    throw new Error("Ce contrat est déjà signé ou lié.");
  }

  const email = input.signerEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email signataire invalide.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const html = buildContractPdfHtml(contract, siteUrl);
  const doc = await renderHtmlToDocument(html);
  if (doc.mimeType !== "application/pdf") {
    throw new Error(
      "Impossible de générer le PDF contrat (Chromium indisponible). Définissez CHROMIUM_EXECUTABLE_PATH.",
    );
  }

  const request = await createYousignSignatureRequest({
    name: `${contract.reference} — ${contract.title}`,
  });
  const document = await uploadYousignDocument({
    signatureRequestId: request.id,
    filename: `${contract.reference}.pdf`,
    pdfBuffer: doc.buffer,
  });

  const { firstName, lastName } = splitName(
    input.signerName?.trim() || contract.clientName || "Client",
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
      `UPDATE crm_contracts SET
        status = 'sent',
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
      `INSERT INTO contract_signature_events (contract_id, provider, event_type, external_id, payload)
       VALUES ($1, 'yousign', 'signature_request.activated', $2, $3::jsonb)`,
      [
        contract.id,
        request.id,
        JSON.stringify({ documentId: document.id, signerEmail: email }),
      ],
    );
    const updated = await getContractById(contract.id);
    return updated!;
  });
}

export async function markContractSignedFromWebhook(input: {
  externalId: string;
  eventType: string;
  payload: unknown;
}): Promise<Contract | null> {
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM crm_contracts WHERE esign_external_id = $1 LIMIT 1`,
      [input.externalId],
    );
    const contractId = rows[0]?.id;
    if (!contractId) return null;

    await query(
      `UPDATE crm_contracts SET
        status = 'signed',
        signed_at = COALESCE(signed_at, NOW()),
        esign_completed_at = NOW(),
        updated_at = NOW()
       WHERE id = $1`,
      [contractId],
    );
    await query(
      `INSERT INTO contract_signature_events (contract_id, provider, event_type, external_id, payload)
       VALUES ($1, 'yousign', $2, $3, $4::jsonb)`,
      [
        contractId,
        input.eventType.slice(0, 80),
        input.externalId,
        JSON.stringify(input.payload ?? {}),
      ],
    );
    return getContractById(contractId);
  });
}
