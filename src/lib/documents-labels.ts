import type { DocumentCategory } from "@/lib/s3";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  invoices: "Factures",
  contracts: "Contrats",
  deliverables: "Livrables",
  uploads: "Vos dépôts",
  misc: "Autres",
  archive: "Archives",
};

export const CLIENT_VISIBLE_CATEGORIES: DocumentCategory[] = [
  "invoices",
  "contracts",
  "deliverables",
  "uploads",
  "misc",
];

export const ADMIN_UPLOAD_CATEGORIES: DocumentCategory[] = [
  "invoices",
  "contracts",
  "deliverables",
  "misc",
];

export const CATEGORY_STYLES: Record<
  DocumentCategory,
  { bg: string; text: string; icon: "invoice" | "contract" | "deliverable" | "upload" | "misc" }
> = {
  invoices: { bg: "bg-sky-100", text: "text-sky-700", icon: "invoice" },
  contracts: { bg: "bg-violet-100", text: "text-violet-700", icon: "contract" },
  deliverables: { bg: "bg-emerald-100", text: "text-emerald-700", icon: "deliverable" },
  uploads: { bg: "bg-amber-100", text: "text-amber-700", icon: "upload" },
  misc: { bg: "bg-gray-light", text: "text-gray-text", icon: "misc" },
  archive: { bg: "bg-slate-100", text: "text-slate-700", icon: "misc" },
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatDocumentDate(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export const ACCEPTED_FILE_TYPES =
  ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx";

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export function isAcceptedMimeType(type: string): type is (typeof ACCEPTED_MIME_TYPES)[number] {
  return (ACCEPTED_MIME_TYPES as readonly string[]).includes(type);
}
