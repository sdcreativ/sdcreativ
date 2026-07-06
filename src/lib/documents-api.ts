import type { DocumentCategory, StoredDocument } from "@/lib/s3";
import { MAX_DOCUMENT_BYTES } from "@/lib/validations/documents";
import { isAcceptedMimeType } from "@/lib/documents-labels";

type ApiError = { error: string };

type ListResponse = { documents: StoredDocument[] };

type PresignResponse = {
  key: string;
  uploadUrl: string;
  expiresIn: number;
  maxBytes: number;
};

type DownloadResponse = {
  downloadUrl: string;
  expiresIn: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json()) as T & ApiError;
  if (!res.ok) {
    throw new Error(json.error ?? "Une erreur est survenue.");
  }
  return json;
}

export async function fetchDocuments(
  clientId: string,
  category?: DocumentCategory,
): Promise<StoredDocument[]> {
  const params = new URLSearchParams({ clientId });
  if (category) params.set("category", category);

  const res = await fetch(`/api/documents?${params}`, { credentials: "include" });
  const json = await parseJson<ListResponse>(res);
  return json.documents;
}

export async function requestUploadUrl(
  clientId: string,
  category: DocumentCategory,
  file: File,
): Promise<PresignResponse> {
  if (!isAcceptedMimeType(file.type)) {
    throw new Error("Type de fichier non autorisé.");
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("Fichier trop volumineux (max 10 Mo).");
  }

  const res = await fetch("/api/documents", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      category,
      filename: file.name,
      contentType: file.type,
    }),
  });

  return parseJson<PresignResponse>(res);
}

export async function uploadFileToS3(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) {
    throw new Error("Échec de l'envoi du fichier vers le stockage.");
  }
}

export async function uploadDocument(
  clientId: string,
  category: DocumentCategory,
  file: File,
): Promise<string> {
  const presign = await requestUploadUrl(clientId, category, file);
  await uploadFileToS3(presign.uploadUrl, file);
  return presign.key;
}

export async function fetchDownloadUrl(key: string): Promise<string> {
  const params = new URLSearchParams({ key });
  const res = await fetch(`/api/documents/download?${params}`, {
    credentials: "include",
  });
  const json = await parseJson<DownloadResponse>(res);
  return json.downloadUrl;
}

export async function deleteDocument(key: string): Promise<void> {
  const res = await fetch("/api/documents", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  await parseJson<{ success: boolean }>(res);
}

export async function fetchAdminClients(): Promise<
  Array<{ id: string; label: string; company: string }>
> {
  const res = await fetch("/api/admin/portal-accounts", { credentials: "include" });
  const json = await parseJson<{
    clients: Array<{ id: string; label: string; company: string }>;
  }>(res);
  return json.clients;
}
