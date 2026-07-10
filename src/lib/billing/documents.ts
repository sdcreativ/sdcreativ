import { createHash } from "node:crypto";
import { withDb } from "@/lib/db";
import type { BillingDocument, BillingDocumentKind } from "@/lib/billing/types";
import {
  buildBillingDocumentKey,
  isS3Configured,
  uploadObjectBuffer,
} from "@/lib/s3";

type BillingDocumentRow = {
  id: string;
  quote_id: string | null;
  invoice_id: string | null;
  kind: BillingDocumentKind;
  s3_key: string;
  file_name: string;
  mime_type: string;
  sha256: string;
  file_size: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

function mapDocument(row: BillingDocumentRow): BillingDocument {
  return {
    id: row.id,
    quoteId: row.quote_id,
    invoiceId: row.invoice_id,
    kind: row.kind,
    s3Key: row.s3_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sha256: row.sha256,
    fileSize: row.file_size ? Number(row.file_size) : null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at.toISOString(),
  };
}

export async function saveBillingDocument(input: {
  quoteId?: string | null;
  invoiceId?: string | null;
  kind: BillingDocumentKind;
  portalClientId: string;
  quoteIdForKey: string;
  fileNameBase: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  metadata?: Record<string, unknown>;
}): Promise<BillingDocument> {
  if (!isS3Configured()) {
    throw new Error("Stockage S3 non configuré.");
  }

  const sha256 = createHash("sha256").update(input.buffer).digest("hex");
  const fileName = `${input.fileNameBase}.${input.extension}`;
  const s3Key = buildBillingDocumentKey(
    input.portalClientId,
    input.quoteIdForKey,
    input.kind,
    fileName,
  );

  await uploadObjectBuffer(s3Key, input.buffer, input.mimeType);

  return withDb(async (query) => {
    const { rows } = await query<BillingDocumentRow>(
      `INSERT INTO billing_documents (
        quote_id, invoice_id, kind, s3_key, file_name, mime_type, sha256, file_size, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      RETURNING *`,
      [
        input.quoteId ?? null,
        input.invoiceId ?? null,
        input.kind,
        s3Key,
        fileName,
        input.mimeType,
        sha256,
        input.buffer.byteLength,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
    return mapDocument(rows[0]);
  });
}

export async function listBillingDocumentsForQuote(quoteId: string): Promise<BillingDocument[]> {
  return withDb(async (query) => {
    const { rows } = await query<BillingDocumentRow>(
      `SELECT * FROM billing_documents WHERE quote_id = $1 ORDER BY created_at DESC`,
      [quoteId],
    );
    return rows.map(mapDocument);
  });
}

export async function getLatestBillingDocument(
  quoteId: string,
  kind: BillingDocumentKind,
): Promise<BillingDocument | null> {
  return withDb(async (query) => {
    const { rows } = await query<BillingDocumentRow>(
      `SELECT * FROM billing_documents
       WHERE quote_id = $1 AND kind = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [quoteId, kind],
    );
    return rows[0] ? mapDocument(rows[0]) : null;
  });
}

export async function getLatestInvoiceBillingDocument(
  invoiceId: string,
  kind: BillingDocumentKind = "invoice_pdf",
): Promise<BillingDocument | null> {
  return withDb(async (query) => {
    const { rows } = await query<BillingDocumentRow>(
      `SELECT * FROM billing_documents
       WHERE invoice_id = $1 AND kind = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [invoiceId, kind],
    );
    return rows[0] ? mapDocument(rows[0]) : null;
  });
}

export async function listBillingDocumentsForInvoice(invoiceId: string): Promise<BillingDocument[]> {
  return withDb(async (query) => {
    const { rows } = await query<BillingDocumentRow>(
      `SELECT * FROM billing_documents WHERE invoice_id = $1 ORDER BY created_at DESC`,
      [invoiceId],
    );
    return rows.map(mapDocument);
  });
}
