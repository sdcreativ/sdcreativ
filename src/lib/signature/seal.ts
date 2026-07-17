import { createHash } from "node:crypto";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { logSignatureEvent } from "@/lib/signature/events";
import type { SignatureEntityType } from "@/lib/signature/types";

export type SealedDocument = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  documentSha256: string;
  signatureHash: string;
};

/**
 * Rend le HTML en PDF (ou HTML fallback), calcule SHA-256 du buffer final
 * et un hash de preuve signataire (métadonnées + début du tracé).
 */
export async function sealSignatureDocument(input: {
  entityType: SignatureEntityType;
  entityId: string;
  html: string;
  signerName: string;
  signerEmail: string;
  signatureDataUrl: string;
  signedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<SealedDocument> {
  const rendered = await renderHtmlToDocument(input.html);
  const documentSha256 = createHash("sha256").update(rendered.buffer).digest("hex");
  const signatureHash = createHash("sha256")
    .update(
      [
        input.entityType,
        input.entityId,
        input.signerName,
        input.signerEmail,
        input.signedAt.toISOString(),
        documentSha256,
        input.signatureDataUrl.slice(0, 1024),
      ].join("|"),
    )
    .digest("hex");

  await logSignatureEvent({
    entityType: input.entityType,
    entityId: input.entityId,
    eventType: "pdf.sealed",
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    payload: {
      documentSha256,
      signatureHash,
      mimeType: rendered.mimeType,
    },
  });

  return {
    buffer: rendered.buffer,
    mimeType: rendered.mimeType,
    extension: rendered.extension,
    documentSha256,
    signatureHash,
  };
}
