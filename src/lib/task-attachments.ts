import { z } from "zod";
import { withDb } from "@/lib/db";
import {
  buildTaskAttachmentKey,
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  deleteDocument,
  isS3Configured,
} from "@/lib/s3";

export type TaskAttachment = {
  id: string;
  taskId: string;
  filename: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
};

type AttachmentRow = {
  id: string;
  task_id: string;
  filename: string;
  s3_key: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  created_at: Date;
};

function mapAttachment(row: AttachmentRow): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    filename: row.filename,
    s3Key: row.s3_key,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at.toISOString(),
  };
}

const allowedContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/octet-stream",
] as const;

export const createAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(allowedContentTypes),
  sizeBytes: z.number().int().min(0).max(20_000_000).optional(),
  uploadedBy: z.string().trim().max(100).optional().nullable(),
});

export async function listTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  return withDb(async (query) => {
    const { rows } = await query<AttachmentRow>(
      `SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC`,
      [taskId],
    );
    return rows.map(mapAttachment);
  });
}

export async function prepareTaskAttachmentUpload(
  taskId: string,
  input: z.infer<typeof createAttachmentSchema>,
): Promise<{ attachment: TaskAttachment; uploadUrl: string; expiresIn: number }> {
  if (!isS3Configured()) {
    throw new Error("Stockage S3 non configuré.");
  }

  const s3Key = buildTaskAttachmentKey(taskId, input.filename);
  const { uploadUrl, expiresIn } = await createPresignedUploadUrl(s3Key, input.contentType);

  const attachment = await withDb(async (query) => {
    const { rows } = await query<AttachmentRow>(
      `INSERT INTO task_attachments (task_id, filename, s3_key, content_type, size_bytes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        taskId,
        input.filename,
        s3Key,
        input.contentType,
        input.sizeBytes ?? 0,
        input.uploadedBy ?? null,
      ],
    );
    return mapAttachment(rows[0]!);
  });

  return { attachment, uploadUrl, expiresIn };
}

export async function getTaskAttachmentDownloadUrl(
  attachmentId: string,
): Promise<{ downloadUrl: string; expiresIn: number; filename: string } | null> {
  if (!isS3Configured()) return null;

  const attachment = await withDb(async (query) => {
    const { rows } = await query<AttachmentRow>(
      `SELECT * FROM task_attachments WHERE id = $1`,
      [attachmentId],
    );
    return rows[0] ? mapAttachment(rows[0]) : null;
  });

  if (!attachment) return null;

  const { downloadUrl, expiresIn } = await createPresignedDownloadUrl(attachment.s3Key);
  return { downloadUrl, expiresIn, filename: attachment.filename };
}

export async function deleteTaskAttachment(id: string): Promise<boolean> {
  const attachment = await withDb(async (query) => {
    const { rows } = await query<AttachmentRow>(
      `SELECT * FROM task_attachments WHERE id = $1`,
      [id],
    );
    return rows[0] ? mapAttachment(rows[0]) : null;
  });

  if (!attachment) return false;

  if (isS3Configured()) {
    try {
      await deleteDocument(attachment.s3Key);
    } catch {
      // Continue DB delete even if S3 fails
    }
  }

  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM task_attachments WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
