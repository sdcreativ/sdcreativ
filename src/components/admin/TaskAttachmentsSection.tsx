"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskAttachment } from "@/lib/task-attachments";
import {
  deleteTaskAttachmentApi,
  fetchTaskAttachments,
  getTaskAttachmentDownloadUrlApi,
  prepareTaskAttachmentUploadApi,
} from "@/lib/tasks-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt";

export function TaskAttachmentsSection({ taskId }: { taskId: string }) {
  const { confirm } = useDialog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAttachments(await fetchTaskAttachments(taskId));
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { attachment, uploadUrl } = await prepareTaskAttachmentUploadApi(taskId, {
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) throw new Error("Échec de l'upload S3.");
      setAttachments((prev) => [attachment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(attachmentId: string) {
    const url = await getTaskAttachmentDownloadUrlApi(taskId, attachmentId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete(attachmentId: string) {
    const ok = await confirm({
      title: "Supprimer la pièce jointe",
      message: "Supprimer cette pièce jointe ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await deleteTaskAttachmentApi(taskId, attachmentId);
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Pièces jointes</p>
        <label
          htmlFor={`task-attachment-${taskId}`}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-[10px] font-medium hover:bg-gray-light has-disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />}
          Ajouter
        </label>
        <input
          id={`task-attachment-${taskId}`}
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={uploading}
          className="sr-only"
          onChange={(e) => void handleFileSelect(e)}
        />
      </div>

      {error && <p className="mb-2 text-xs text-accent">{error}</p>}

      {loading ? (
        <p className="text-xs text-gray-text">Chargement…</p>
      ) : attachments.length === 0 ? (
        <p className="flex items-center gap-1 text-xs text-gray-text">
          <Paperclip className="h-3 w-3" aria-hidden />
          Aucune pièce jointe.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-lg border border-gray/30 bg-white px-2 py-1.5 text-sm"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-gray-text" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{attachment.filename}</span>
              <span className="shrink-0 text-[10px] text-gray-text">{formatFileSize(attachment.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => void handleDownload(attachment.id)}
                className="rounded p-1 text-primary hover:bg-primary-light/30"
                aria-label="Télécharger"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(attachment.id)}
                className="rounded p-1 text-gray-text hover:text-accent"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
