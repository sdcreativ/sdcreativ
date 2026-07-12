import { z } from "zod";
import { contactSubjectOptions } from "@/content/contact-options";

const subjectValues = contactSubjectOptions.map((o) => o.value) as [string, ...string[]];

export const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  phone: z.string().optional(),
  company: z.string().optional(),
  subject: z.enum(subjectValues, { message: "Veuillez sélectionner un sujet." }),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères."),
});

export type ContactPayload = z.infer<typeof contactSchema>;
