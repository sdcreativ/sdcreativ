import { z } from "zod";

export const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  company: z.string().trim().max(100).optional(),
  interest: z.enum(["espace-client", "crm", "general"]),
  message: z.string().trim().max(1000).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
