/** Types et constantes documents — sans AWS / ClamAV (safe côté client). */

export const DOCUMENT_CATEGORIES = [
  "invoices",
  "contracts",
  "deliverables",
  "uploads",
  "misc",
  "archive",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type StoredDocument = {
  key: string;
  name: string;
  category: DocumentCategory;
  size: number;
  lastModified: string;
  projectId?: string;
};

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
