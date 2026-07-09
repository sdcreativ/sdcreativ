import { z } from "zod";
import { budgetOptions, timelineOptions } from "@/content/contact-options";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";

const budgetValues = budgetOptions.map((o) => o.value) as [string, ...string[]];
const timelineValues = timelineOptions.map((o) => o.value) as [string, ...string[]];

export function createDevisSchema(config: Pick<SiteQuoteConfigSettings, "projectTypes" | "pageTiers" | "addons">) {
  const projectIds = config.projectTypes.map((p) => p.id);
  const addonIds = new Set(config.addons.map((a) => a.id));
  const pageTierIds = new Set(config.pageTiers.map((t) => t.id));

  if (projectIds.length === 0) {
    throw new Error("Aucun type de projet configuré.");
  }

  return z.object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
    email: z.string().email("Adresse email invalide."),
    phone: z.string().optional(),
    company: z.string().optional(),
    projectTypeId: z.enum(projectIds as [string, ...string[]], { message: "Type de projet invalide." }),
    pageTierId: z.string().optional(),
    addonIds: z
      .array(z.string())
      .default([])
      .refine((ids) => ids.every((id) => addonIds.has(id)), { message: "Option invalide." }),
    budget: z.enum(budgetValues, { message: "Veuillez indiquer un budget." }),
    timeline: z.enum(timelineValues, { message: "Veuillez indiquer un délai." }),
    message: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.pageTierId && !pageTierIds.has(data.pageTierId)) {
      ctx.addIssue({ code: "custom", message: "Palier de pages invalide.", path: ["pageTierId"] });
    }
  });
}

export type DevisPayload = z.infer<ReturnType<typeof createDevisSchema>>;
