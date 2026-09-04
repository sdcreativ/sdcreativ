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
});

export type ChatInput = z.infer<typeof chatSchema>;
