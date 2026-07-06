import { z } from "zod";
import { budgetOptions, timelineOptions } from "@/content/contact-options";
import { quoteProjectTypes } from "@/content/quote-config";

const projectIds = quoteProjectTypes.map((p) => p.id) as [string, ...string[]];
const budgetValues = budgetOptions.map((o) => o.value) as [string, ...string[]];
const timelineValues = timelineOptions.map((o) => o.value) as [string, ...string[]];

export const devisSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse email invalide."),
  phone: z.string().optional(),
  company: z.string().optional(),
  projectTypeId: z.enum(projectIds, { message: "Type de projet invalide." }),
  pageTierId: z.string().optional(),
  addonIds: z.array(z.string()).default([]),
  budget: z.enum(budgetValues, { message: "Veuillez indiquer un budget." }),
  timeline: z.enum(timelineValues, { message: "Veuillez indiquer un délai." }),
  message: z.string().optional(),
});

export type DevisPayload = z.infer<typeof devisSchema>;
