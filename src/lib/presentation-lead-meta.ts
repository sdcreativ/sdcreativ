import type { Lead } from "@/lib/leads";
import type { PresentationContext } from "@/lib/presentation-types";

export function getLeadPresentationMeta(lead: Lead): PresentationContext | null {
  const raw = lead.metadata?.presentation;
  if (!raw || typeof raw !== "object") return null;

  const meta = raw as Partial<PresentationContext>;
  if (
    !meta.track ||
    !meta.location ||
    !meta.presenterName ||
    !Array.isArray(meta.slidesCompleted)
  ) {
    return null;
  }

  return meta as PresentationContext;
}
