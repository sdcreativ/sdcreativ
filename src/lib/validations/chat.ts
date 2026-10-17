import { z } from "zod";

export const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(500),
});

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Message trop court")
    .max(500, "Message trop long (500 caractères max)"),
  locale: z.enum(["fr", "en"]).optional().default("fr"),
  history: z.array(chatTurnSchema).max(12).optional().default([]),
  mode: z.enum(["handoff", "after_hours", "default"]).optional().default("default"),
  /** Identifiant tiré au hasard par le widget pour la session (enregistrement de la conversation). */
  conversationId: z.string().uuid().optional(),
  pagePath: z.string().trim().max(300).optional(),
});

export type ChatInput = z.infer<typeof chatSchema>;
