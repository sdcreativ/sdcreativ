import { createHash, randomBytes } from "node:crypto";
import { getPdfDocumentCompany } from "@/lib/billing/document-company";
import {
  archiveEmployeeContractToS3,
  rearchiveEditableEmployeeContract,
} from "@/lib/employee-contract-archive";
import {
  getEmployeeContractById,
  type EmployeeContract,
} from "@/lib/employee-contracts";
import { withDb } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/email";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { buildEmployeeContractPdfHtml } from "@/lib/signature/employee-contract-pdf";
import { verifySignatureOtp } from "@/lib/signature/otp";
import { logSignatureEvent } from "@/lib/signature/events";
import { NATIVE_SIGN_LINK_TTL_HOURS } from "@/lib/signature/types";
import { EMPLOYEE_CONTRACT_TYPE_LABELS } from "@/content/employee-contracts-labels";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function sendEmployeeContractForNativeSignature(input: {
  contractId: string;
  signerEmail?: string | null;
}): Promise<{ contract: EmployeeContract; signUrl: string }> {
  const contract = await getEmployeeContractById(input.contractId);
  if (!contract) throw new Error("Contrat introuvable.");
  if (["signed", "active", "ended", "cancelled"].includes(contract.status)) {
    throw new Error("Ce contrat n'est plus signable.");
  }
  if (contract.signatureProvider === "yousign" && contract.esignExternalId) {
    throw new Error(
      "Ce contrat a déjà une demande Yousign active. Attendez la finalisation.",
    );
  }

  const email =
    input.signerEmail?.trim().toLowerCase() ||
    contract.userEmail?.trim().toLowerCase() ||
    null;
  if (!email?.includes("@")) {
    throw new Error("Email signataire requis (email personnel du collaborateur).");
  }

  const plainToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + NATIVE_SIGN_LINK_TTL_HOURS * 3600_000);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(
    /\/$/,
    "",
  );
  const signUrl = `${siteUrl}/espace-equipe/signer/contrat/${plainToken}`;

  await withDb(async (query) => {
    await query(
      `UPDATE employee_contracts SET
         status = 'pending_signature',
         sent_at = COALESCE(sent_at, NOW()),
         signature_provider = 'native',
         esign_signer_email = $2,
         esign_sent_at = NOW(),
         native_sign_token_hash = $3,
         native_sign_token_expires_at = $4,
         updated_at = NOW()
       WHERE id = $1`,
      [contract.id, email, tokenHash, expiresAt],
    );
  });

  const pending = (await getEmployeeContractById(contract.id))!;
  await rearchiveEditableEmployeeContract(pending);

  await logSignatureEvent({
    entityType: "employee_contract",
    entityId: contract.id,
    eventType: "native.sent",
    payload: { email, expiresAt: expiresAt.toISOString() },
  });

  const typeLabel = EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType];
  const sent = await sendEmail({
    to: email,
    subject: `Signature contrat ${typeLabel} — ${contract.reference}`,
    html: `
      <p>Bonjour${contract.userName ? ` ${escapeHtml(contract.userName)}` : ""},</p>
      <p>SD CREATIV vous invite à signer votre contrat <strong>${escapeHtml(typeLabel)}</strong>
      <strong>${escapeHtml(contract.reference)}</strong>
      (« ${escapeHtml(contract.title)} ») via notre signature électronique renforcée.</p>
      <p><a href="${signUrl}" style="display:inline-block;padding:12px 20px;background:#1e40af;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Ouvrir la page de signature</a></p>
      <p style="font-size:13px;color:#555">Lien valable ${NATIVE_SIGN_LINK_TTL_HOURS} h. Un code par email vous sera demandé avant de finaliser.</p>
      <p style="font-size:12px;color:#888">Signature SD CREATIV (preuve métier) — pas une signature eIDAS qualifiée.</p>
    `,
  });
  if (!sent) {
    console.warn("[native-employee-contract] invitation email non envoyé — lien généré quand même");
  }

  const updated = await getEmployeeContractById(contract.id);
  return { contract: updated!, signUrl };
}

export async function getEmployeeContractByNativeSignToken(
  token: string,
): Promise<EmployeeContract | null> {
  const tokenHash = hashToken(token);
  return withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM employee_contracts
       WHERE native_sign_token_hash = $1
         AND native_sign_token_expires_at IS NOT NULL
         AND native_sign_token_expires_at > NOW()
         AND status IN ('pending_signature', 'draft')
       LIMIT 1`,
      [tokenHash],
    );
    if (!rows[0]) return null;
    return getEmployeeContractById(rows[0].id);
  });
}

export async function signEmployeeContractNative(input: {
  token: string;
  signerName: string;
  signatureData: string;
  otpCode: string;
  acceptTerms: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<EmployeeContract> {
  if (!input.acceptTerms) {
    throw new Error("Vous devez accepter les conditions pour signer.");
  }
  const signerName = input.signerName.trim();
  if (signerName.length < 2) throw new Error("Indiquez votre nom complet.");
  if (!input.signatureData.startsWith("data:image/")) {
    throw new Error("Signature invalide.");
  }

  const contract = await getEmployeeContractByNativeSignToken(input.token);
  if (!contract) throw new Error("Lien de signature invalide ou expiré.");
  if (["signed", "active", "ended", "cancelled"].includes(contract.status)) {
    throw new Error("Ce contrat est déjà signé.");
  }

  const otp = await verifySignatureOtp({
    entityType: "employee_contract",
    entityId: contract.id,
    code: input.otpCode,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  const signedAt = new Date();
  const signerEmail = otp.email;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const company = await getPdfDocumentCompany(siteUrl);

  const draftHtml = buildEmployeeContractPdfHtml(
    contract,
    siteUrl,
    {
      signerName,
      signedAt: signedAt.toISOString(),
      signatureHash: "pending",
      signatureDataUrl: input.signatureData,
    },
    company,
  );
  const draftDoc = await renderHtmlToDocument(draftHtml);
  const documentSha256 = createHash("sha256").update(draftDoc.buffer).digest("hex");
  const signatureHash = createHash("sha256")
    .update(
      `employee_contract|${contract.id}|${signerName}|${signerEmail}|${signedAt.toISOString()}|${documentSha256}|${input.signatureData.slice(0, 1024)}`,
    )
    .digest("hex");

  const finalHtml = buildEmployeeContractPdfHtml(
    contract,
    siteUrl,
    {
      signerName,
      signedAt: signedAt.toISOString(),
      signatureHash,
      signatureDataUrl: input.signatureData,
      documentSha256,
    },
    company,
  );
  const rendered = await renderHtmlToDocument(finalHtml);
  const finalDocumentSha256 = createHash("sha256").update(rendered.buffer).digest("hex");

  await logSignatureEvent({
    entityType: "employee_contract",
    entityId: contract.id,
    eventType: "pdf.sealed",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    payload: { documentSha256: finalDocumentSha256, signatureHash },
  });

  await withDb(async (query) => {
    await query(
      `UPDATE employee_contracts SET
         status = 'signed',
         signed_at = $2,
         signature_provider = 'native',
         esign_completed_at = NOW(),
         native_sign_token_hash = NULL,
         native_sign_token_expires_at = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [contract.id, signedAt],
    );
  });

  const signedContract = (await getEmployeeContractById(contract.id))!;
  const archived = await archiveEmployeeContractToS3({
    contract: signedContract,
    variant: "signed",
    buffer: rendered.buffer,
    mimeType: rendered.mimeType,
    extension: rendered.extension,
    signature: {
      signerName,
      signedAt: signedAt.toISOString(),
      signatureHash,
      signatureDataUrl: input.signatureData,
      documentSha256: finalDocumentSha256,
    },
  });

  await withDb(async (query) => {
    await query(
      `INSERT INTO employee_contract_signatures (
         contract_id, signer_name, signer_email, signature_data, signature_hash,
         document_sha256, otp_verified_at, provider, ip_address, user_agent,
         signed_at, proof_s3_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'native',$8,$9,$10,$11)
       ON CONFLICT (contract_id) DO NOTHING`,
      [
        contract.id,
        signerName,
        signerEmail,
        input.signatureData,
        signatureHash,
        finalDocumentSha256,
        otp.verifiedAt,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        signedAt,
        archived.documentS3Key,
      ],
    );
  });

  await logSignatureEvent({
    entityType: "employee_contract",
    entityId: contract.id,
    eventType: "signed",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    payload: {
      signatureHash,
      documentSha256: finalDocumentSha256,
      documentS3Key: archived.documentS3Key,
    },
  });

  return archived;
}
