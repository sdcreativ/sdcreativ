import { withDb } from "@/lib/db";
import { listSignatureEvents, type SignatureEvent } from "@/lib/signature/events";

export type QuoteSignatureProof = {
  signerName: string;
  signerEmail: string;
  signedAt: string;
  otpVerifiedAt: string | null;
  signatureHash: string;
  documentSha256: string | null;
  provider: string;
  ipAddress: string | null;
  userAgent: string | null;
  proofDocumentId: string | null;
  events: SignatureEvent[];
};

export async function getQuoteSignatureProof(
  quoteId: string,
): Promise<QuoteSignatureProof | null> {
  const row = await withDb(async (query) => {
    const { rows } = await query<{
      signer_name: string;
      signer_email: string;
      signed_at: Date;
      otp_verified_at: Date | null;
      signature_hash: string;
      document_sha256: string | null;
      provider: string | null;
      ip_address: string | null;
      user_agent: string | null;
      proof_document_id: string | null;
    }>(
      `SELECT signer_name, signer_email, signed_at, otp_verified_at, signature_hash,
              document_sha256, provider, ip_address, user_agent, proof_document_id
       FROM quote_signatures WHERE quote_id = $1 LIMIT 1`,
      [quoteId],
    );
    return rows[0] ?? null;
  });

  if (!row) return null;

  const events = await listSignatureEvents("quote", quoteId);

  return {
    signerName: row.signer_name,
    signerEmail: row.signer_email,
    signedAt: row.signed_at.toISOString(),
    otpVerifiedAt: row.otp_verified_at?.toISOString() ?? null,
    signatureHash: row.signature_hash,
    documentSha256: row.document_sha256,
    provider: row.provider ?? "native",
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    proofDocumentId: row.proof_document_id,
    events,
  };
}
