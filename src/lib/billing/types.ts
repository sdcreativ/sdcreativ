import type { QuoteStatus } from "@/content/quotes-labels";

export type BillingDocumentKind =
  | "quote_pdf"
  | "signed_quote_pdf"
  | "invoice_pdf"
  | "signature_proof";

export type BillingEntityType = "quote" | "invoice";

export type BillingActorType = "admin" | "client" | "system";

export type BillingDocument = {
  id: string;
  quoteId: string | null;
  invoiceId: string | null;
  kind: BillingDocumentKind;
  s3Key: string;
  fileName: string;
  mimeType: string;
  sha256: string;
  fileSize: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BillingEvent = {
  id: string;
  entityType: BillingEntityType;
  entityId: string;
  action: string;
  actorType: BillingActorType;
  actorId: string | null;
  actorName: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BillingActor = {
  type: BillingActorType;
  id?: string | null;
  name?: string | null;
};

export const QUOTE_PUBLISHABLE_STATUSES: QuoteStatus[] = [
  "draft",
  "sent",
  "follow_up",
  "negotiation",
];

export const QUOTE_VALIDITY_DAYS = 30;
