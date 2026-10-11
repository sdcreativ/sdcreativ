import { z } from "zod";

/** Formulaire court de la page publicité (audit gratuit) : le minimum pour rappeler le prospect. */
export const landingLeadSchema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom.").max(80),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .refine((value) => value.replace(/\D/g, "").length >= 8, "Numéro WhatsApp invalide."),
  email: z.string().trim().email("Adresse e-mail invalide.").max(255),
  company: z.string().trim().max(160).optional(),
  website: z.string().trim().max(255).optional(),
});

export type LandingLeadPayload = z.infer<typeof landingLeadSchema>;
