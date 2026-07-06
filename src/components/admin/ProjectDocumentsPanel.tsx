"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { DOCUMENT_CATEGORY_LABELS, formatFileSize } from "@/lib/documents-labels";
import type { StoredDocument } from "@/lib/s3";
import { DOCUMENT_CATEGORIES } from "@/lib/s3";
import { fetchProjectDocuments, presignProjectDocumentUpload } from "@/lib/projects-api";
import { fetchDownloadUrl } from "@/lib/documents-api";
import { cn } from "@/lib/utils";
import { Download, FileText, Loader2, Upload } from "lucide-react";

type Props = {
  projectId: string;
  clientPortalHref?: string | null;
};

export function ProjectDocumentsPanel({ projectId, clientPortalHref }: Props) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProjectDocuments(projectId);
      setDocuments(data.documents);
      setHint(data.hint ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les documents.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { uploadUrl } = await presignProjectDocumentUpload(projectId, {
        category: "deliverables",
        filename: file.name,
        contentType: file.type,
      });
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Échec de l'envoi vers S3.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDownload(key: string) {
    const downloadUrl = await fetchDownloadUrl(key);
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-foreground">Documents projet</h3>
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light/30",
            (uploading || hint) && "pointer-events-none opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          Ajouter
          <input type="file" className="sr-only" onChange={(e) => void handleUpload(e)} disabled={uploading || Boolean(hint)} />
        </label>
      </div>

      {hint && (
        <p className="mt-2 text-xs text-amber-700">
          {hint}{" "}
          {clientPortalHref && (
            <Link href={clientPortalHref} className="font-semibold underline">
              Configurer le client →
            </Link>
          )}
        </p>
      )}

      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : documents.length === 0 ? (
        <p className="mt-3 text-sm text-gray-text">Aucun document lié à ce projet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.key}
              className="flex items-center justify-between gap-2 rounded-xl border border-gray/25 bg-gray-light/30 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="text-[10px] text-gray-text">
                    {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatFileSize(doc.size)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleDownload(doc.key)}
                className="shrink-0 rounded-lg p-1.5 text-gray-text hover:bg-white hover:text-primary"
                aria-label={`Télécharger ${doc.name}`}
              >
                <Download className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[10px] text-gray-text">
        Stockés sous <code className="rounded bg-gray-light px-1">clients/…/projects/{projectId.slice(0, 8)}…/</code>
        {DOCUMENT_CATEGORIES.includes("deliverables") ? "" : ""}
      </p>
    </div>
  );
}
