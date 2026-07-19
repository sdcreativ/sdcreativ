/**
 * Screen-pop 3CX PME : ouverture fiche CRM depuis %CallerNumber%.
 * URL console 3CX :
 * https://sdcreativ.com/admin/crm/3cx-pop?phone=%CallerNumber%&name=%CallerDisplayName%
 */

import { lookupThreeCxContact } from "@/lib/threecx/contacts";

/** URL à coller dans 3CX → Réglages → Intégration → CRM personnalisé. */
export const THREECX_PME_SCREEN_POP_URL =
  "https://sdcreativ.com/admin/crm/3cx-pop?phone=%CallerNumber%&name=%CallerDisplayName%";

export async function resolveThreeCxScreenPopUrl(input: {
  phone?: string | null;
  name?: string | null;
}): Promise<string> {
  const phone = (input.phone ?? "").trim();
  const name = (input.name ?? "").trim();

  if (phone) {
    const contact = await lookupThreeCxContact({ phone });
    if (contact?.entityType === "client") {
      return `/admin/crm/clients?id=${encodeURIComponent(contact.id)}`;
    }
    if (contact?.entityType === "lead") {
      return `/admin/crm/leads?id=${encodeURIComponent(contact.id)}`;
    }
  }

  const params = new URLSearchParams({ create: "1", source: "call_3cx" });
  if (phone) params.set("phone", phone);
  if (name) params.set("name", name);
  if (phone) params.set("q", phone);
  return `/admin/crm/leads?${params.toString()}`;
}
