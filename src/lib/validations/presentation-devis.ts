import { z } from "zod";
import { createDevisSchema } from "@/lib/validations/devis";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";

const presentationMetaSchema = z.object({
  track: z.enum(["salon", "bureau"]),
  location: z.enum(["salon", "bureau_client", "bureau_sdcreativ", "visio", "autre"]),
  locationNote: z.string().trim().max(200).optional(),
  clientSector: z.string().trim().max(120).optional(),
  presenterNotes: z.string().trim().max(2000).optional(),
  presenterId: z.string().uuid(),
  presenterName: z.string().trim().min(2).max(160),
  presenterEmail: z.string().trim().email().max(255),
  slidesCompleted: z.array(z.string()).min(1),
  startedAt: z.string().datetime(),
  validatedAt: z.string().datetime(),
  clientValidatedOrally: z.literal(true),
});

export function createPresentationDevisSchema(
  config: Pick<SiteQuoteConfigSettings, "projectTypes" | "pageTiers" | "addons">,
) {
  return createDevisSchema(config).extend({
    presentation: presentationMetaSchema,
  });
}
