import { z } from "zod";
import { jobSelectOptions } from "@/content/carrieres";

const jobIds = jobSelectOptions.map((o) => o.value) as [string, ...string[]];

export const carriereSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(100),
  email: z.string().trim().email("Email invalide"),
  phone: z.string().trim().min(8, "Téléphone requis").max(20),
  city: z.string().trim().min(2, "Ville ou zone requise").max(100),
  jobId: z.enum(jobIds, { message: "Choisissez un poste" }),
  experience: z.enum(["debutant", "1-3", "3-5", "5-plus"], {
    message: "Indiquez votre expérience",
  }),
  availability: z.enum(["immediate", "1-mois", "2-mois-plus"], {
    message: "Indiquez votre disponibilité",
  }),
  hasVehicle: z.enum(["oui", "non"], { message: "Réponse requise" }),
  linkedin: z.string().trim().url("URL invalide").optional().or(z.literal("")),
  cvLink: z.string().trim().url("Lien CV invalide").optional().or(z.literal("")),
  motivation: z
    .string()
    .trim()
    .min(50, "Motivation : minimum 50 caractères")
    .max(3000),
});

export type CarriereInput = z.infer<typeof carriereSchema>;
