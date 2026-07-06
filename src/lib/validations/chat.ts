import { z } from "zod";

export const chatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(2, "Message trop court")
    .max(500, "Message trop long (500 caractères max)"),
});

export type ChatInput = z.infer<typeof chatSchema>;
