import { z } from "zod";
import { budgetOptions, timelineOptions } from "@/content/contact-options";
import { services } from "@/content/services";

const serviceIds = services.map((s) => s.id) as [string, ...string[]];
const budgetValues = budgetOptions.map((o) => o.value) as [string, ...string[]];
const timelineValues = timelineOptions.map((o) => o.value) as [string, ...string[]];

export const contactSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  phone: z.string().optional(),
  company: z.string().optional(),
  service: z.enum(serviceIds, { message: "Veuillez sélectionner un service." }),
  budget: z.enum(budgetValues, { message: "Veuillez indiquer un budget." }),
  timeline: z.enum(timelineValues, { message: "Veuillez indiquer un délai." }),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères."),
});

export type ContactPayload = z.infer<typeof contactSchema>;
