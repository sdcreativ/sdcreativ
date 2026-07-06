import { z } from "zod";

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse email est requise.")
    .email("Adresse email invalide."),
  consent: z.literal(true, {
    message: "Vous devez accepter la politique de confidentialité.",
  }),
});
