import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "@/lib/s3";

const clientIdSchema = z
  .string()
  .trim()
  .min(2, "Identifiant client requis.")
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Identifiant client invalide.");

const categorySchema = z.enum(DOCUMENT_CATEGORIES);

const allowedContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const documentListQuerySchema = z.object({
  clientId: clientIdSchema,
  category: categorySchema.optional(),
});

export const documentUploadSchema = z.object({
  clientId: clientIdSchema,
  category: categorySchema,
  filename: z
    .string()
    .trim()
    .min(1, "Nom de fichier requis.")
    .max(160),
  contentType: z.enum(allowedContentTypes, {
    message: "Type de fichier non autorisé.",
  }),
});

export const documentDownloadQuerySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(512)
    .regex(/^clients\/[a-zA-Z0-9_-]+(?:\/projects\/[a-zA-Z0-9_-]+)?\/[^/]+\/.+$/, "Clé document invalide."),
});

export const documentDeleteSchema = z.object({
  key: documentDownloadQuerySchema.shape.key,
});

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
