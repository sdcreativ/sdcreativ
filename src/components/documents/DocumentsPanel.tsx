"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderOpen,
  ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import type { DocumentCategory, StoredDocument } from "@/lib/s3";
import {
  deleteDocument,
  fetchDocuments,
  fetchDownloadUrl,
  uploadDocument,
} from "@/lib/documents-api";
import {
  ACCEPTED_FILE_TYPES,
  ADMIN_UPLOAD_CATEGORIES,
  CATEGORY_STYLES,
  CLIENT_VISIBLE_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentDate,
  formatFileSize,
} from "@/lib/documents-labels";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

export type DocumentStats = {
  total: number;
  byCategory: Record<DocumentCategory, number>;
};

type Props = {
  mode: "client" | "admin";
  clientId: string;
  initialCategory?: DocumentCategory;
  onStatsChange?: (stats: DocumentStats) => void;
};

type FilterCategory = DocumentCategory | "all";

const emptyStats = (): DocumentStats => ({
  total: 0,
  byCategory: {
    invoices: 0,
    contracts: 0,
    deliverables: 0,
    uploads: 0,
    misc: 0,
  },
});

function computeStats(documents: StoredDocument[]): DocumentStats {
  const stats = emptyStats();
  stats.total = documents.length;
  for (const doc of documents) {
    stats.byCategory[doc.category] += 1;
  }
  return stats;
}

export function DocumentsPanel({ mode, clientId, initialCategory, onStatsChange }: Props) {
  const { confirm } = useDialog();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [filter, setFilter] = useState<FilterCategory>(initialCategory ?? "all");
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>(
    mode === "client" ? "uploads" : "invoices",
  );
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories =
    mode === "client" ? CLIENT_VISIBLE_CATEGORIES : ADMIN_UPLOAD_CATEGORIES;

  const showUpload =
    mode === "admin" || !initialCategory || initialCategory === "uploads";

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const list = await fetchDocuments(clientId);
      setDocuments(list);
      onStatsChange?.(computeStats(list));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de charger les documents.";
      setError(message);
      setDocuments([]);
      onStatsChange?.(emptyStats());
    } finally {
      setLoading(false);
    }
  }, [clientId, onStatsChange]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const filtered =
    filter === "all"
      ? documents
      : documents.filter((doc) => doc.category === filter);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    const file = files[0];
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      await uploadDocument(clientId, uploadCategory, file);
      setSuccess(`« ${file.name} » publié avec succès.`);
      await loadDocuments();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setUploading(false);
      setDragOver(false);
    }
  }

  async function handleDownload(key: string, name: string) {
    setDownloadingKey(key);
    setError("");

    try {
      const url = await fetchDownloadUrl(key);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.rel = "noopener noreferrer";
      anchor.target = "_blank";
      anchor.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    } finally {
      setDownloadingKey(null);
    }
  }

  async function handleDelete(key: string) {
    const ok = await confirm({
      title: "Supprimer le document",
      message: "Supprimer ce document définitivement ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingKey(key);
    setError("");

    try {
      await deleteDocument(key);
      setSuccess("Document supprimé.");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingKey(null);
    }
  }

  const isAwsError =
    error.includes("AWS") ||
    error.includes("S3") ||
    error.includes("Bucket") ||
    error.includes("stockage");

  return (
    <div className="space-y-5">
      {showUpload && mode === "admin" && (
        <UploadZone
          uploadCategory={uploadCategory}
          onCategoryChange={setUploadCategory}
          uploading={uploading}
          dragOver={dragOver}
          fileInputRef={fileInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            void handleUpload(e.dataTransfer.files);
          }}
          onFileSelect={(files) => void handleUpload(files)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {!initialCategory && (
            <>
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Tous"
                count={documents.length}
              />
              {categories.map((category) => {
                const count = documents.filter((doc) => doc.category === category).length;
                return (
                  <FilterChip
                    key={category}
                    active={filter === category}
                    onClick={() => setFilter(category)}
                    label={DOCUMENT_CATEGORY_LABELS[category]}
                    count={count}
                  />
                );
              })}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadDocuments()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-4 text-sm text-accent">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{error}</p>
              {isAwsError && (
                <p className="mt-2 text-gray-text">
                  Consultez{" "}
                  <code className="rounded bg-white px-1.5 py-0.5 text-xs">docs/AWS-DOCUMENTS.md</code>{" "}
                  pour configurer le bucket S3 en local ou sur Vercel.
                </p>
              )}
              <button
                type="button"
                onClick={() => void loadDocuments()}
                className="mt-3 text-sm font-semibold text-primary hover:underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-20 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement des documents…
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="px-6 py-20 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-text/30" aria-hidden />
            <p className="mt-4 font-semibold text-foreground">Aucun document</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-text">
              {mode === "client"
                ? "Vos factures et livrables apparaîtront ici dès publication par l'équipe SD CREATIV."
                : "Déposez une facture, un contrat ou un livrable — il sera visible dans l'espace client."}
            </p>
            {mode === "admin" && showUpload && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                <Upload className="h-4 w-4" aria-hidden />
                Ajouter un fichier
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? null : mode === "admin" ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.key}
                doc={doc}
                mode={mode}
                downloading={downloadingKey === doc.key}
                deleting={deletingKey === doc.key}
                onDownload={() => void handleDownload(doc.key, doc.name)}
                onDelete={() => void handleDelete(doc.key)}
              />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-gray/40">
            {filtered.map((doc) => (
              <DocumentRow
                key={doc.key}
                doc={doc}
                mode={mode}
                downloading={downloadingKey === doc.key}
                deleting={deletingKey === doc.key}
                onDownload={() => void handleDownload(doc.key, doc.name)}
                onDelete={() => void handleDelete(doc.key)}
              />
            ))}
          </ul>
        )}
      </div>

      {showUpload && mode === "client" && (
        <UploadZone
          uploadCategory="uploads"
          clientMode
          uploading={uploading}
          dragOver={dragOver}
          fileInputRef={fileInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            void handleUpload(e.dataTransfer.files);
          }}
          onFileSelect={(files) => void handleUpload(files)}
        />
      )}
    </div>
  );
}

function UploadZone({
  uploadCategory,
  onCategoryChange,
  clientMode,
  uploading,
  dragOver,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: {
  uploadCategory?: DocumentCategory;
  onCategoryChange?: (category: DocumentCategory) => void;
  clientMode?: boolean;
  uploading: boolean;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed p-6 transition-colors",
        dragOver
          ? "border-primary bg-primary-light/50"
          : "border-primary/30 bg-primary-light/20",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-foreground">
            <Upload className="h-5 w-5 text-primary" aria-hidden />
            {clientMode ? "Déposer un fichier" : "Publier un document"}
          </h3>
          <p className="mt-1 text-sm text-gray-text">
            Glissez-déposez ou sélectionnez — PDF, images, Word, Excel · max. 10 Mo
          </p>
        </div>

        {!clientMode && onCategoryChange && uploadCategory && (
          <label className="block shrink-0 text-sm">
            <span className="mb-1.5 block font-medium text-foreground">Catégorie</span>
            <select
              value={uploadCategory}
              onChange={(e) => onCategoryChange(e.target.value as DocumentCategory)}
              className="rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {ADMIN_UPLOAD_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {DOCUMENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          disabled={uploading}
          className="sr-only"
          aria-label="Sélectionner un fichier"
          onChange={(e) => onFileSelect(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-4 w-4" aria-hidden />
          )}
          {uploading ? "Envoi en cours…" : "Choisir un fichier"}
        </button>
        <span className="text-xs text-gray-text">ou glisser-déposer ici</span>
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  mode,
  downloading,
  deleting,
  onDownload,
  onDelete,
}: {
  doc: StoredDocument;
  mode: "client" | "admin";
  downloading: boolean;
  deleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const style = CATEGORY_STYLES[doc.category];

  return (
    <article className="flex flex-col rounded-xl border border-gray/40 bg-gray-light/20 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            style.bg,
            style.text,
          )}
        >
          <CategoryIcon category={doc.category} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground" title={doc.name}>
            {doc.name}
          </p>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              style.bg,
              style.text,
            )}
          >
            {DOCUMENT_CATEGORY_LABELS[doc.category]}
          </span>
          <p className="mt-2 text-xs text-gray-text">
            {formatFileSize(doc.size)} · {formatDocumentDate(doc.lastModified)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray/60 bg-white py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          Télécharger
        </button>
        {mode === "admin" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Supprimer"
            className="inline-flex items-center justify-center rounded-lg border border-accent/30 px-3 py-2 text-accent hover:bg-accent/5 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
    </article>
  );
}

function DocumentRow({
  doc,
  mode,
  downloading,
  deleting,
  onDownload,
  onDelete,
}: {
  doc: StoredDocument;
  mode: "client" | "admin";
  downloading: boolean;
  deleting: boolean;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const style = CATEGORY_STYLES[doc.category];

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            style.bg,
            style.text,
          )}
        >
          <CategoryIcon category={doc.category} className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{doc.name}</p>
          <p className="mt-0.5 text-xs text-gray-text">
            {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatFileSize(doc.size)} ·{" "}
            {formatDocumentDate(doc.lastModified)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-50"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          Télécharger
        </button>
        {mode === "admin" && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Supprimer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/5 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        )}
      </div>
    </li>
  );
}

function CategoryIcon({
  category,
  className,
}: {
  category: DocumentCategory;
  className?: string;
}) {
  const name = CATEGORY_STYLES[category].icon;
  if (name === "invoice") return <FileText className={className} aria-hidden />;
  if (name === "contract") return <FileType2 className={className} aria-hidden />;
  if (name === "deliverable") return <Package className={className} aria-hidden />;
  if (name === "upload") return <ImageIcon className={className} aria-hidden />;
  return <FileSpreadsheet className={className} aria-hidden />;
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-white shadow-sm"
          : "border border-gray/60 bg-white text-gray-text hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("ml-1.5", active ? "text-white/80" : "text-gray-text")}>
        ({count})
      </span>
    </button>
  );
}
