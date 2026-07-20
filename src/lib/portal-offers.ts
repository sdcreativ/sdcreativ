import { listServiceCatalogItems } from "@/lib/service-catalog";
import type { ServiceCatalogItem } from "@/lib/service-catalog";
import { createLead } from "@/lib/leads";
import { withDb } from "@/lib/db";

export type PortalOffer = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unitPrice: number;
  upsell: boolean;
};

/** Packs catalogue + upsell maintenance pour l’espace client. */
export async function listPortalOffers(): Promise<PortalOffer[]> {
  const items = await listServiceCatalogItems({ activeOnly: true }).catch(
    () => [] as ServiceCatalogItem[],
  );
  const packs = items.filter(
    (i) =>
      i.category === "maintenance" ||
      i.category === "site-web" ||
      i.unit === "mois" ||
      /pack|maintenance|abonnement|support/i.test(`${i.name} ${i.description ?? ""}`),
  );

  if (packs.length === 0) {
    return [
      {
        id: "fallback-maint-basic",
        name: "Pack maintenance Essentiel",
        description: "Mises à jour, sauvegardes et support email — idéal après mise en ligne.",
        category: "maintenance",
        unit: "mois",
        unitPrice: 45_000,
        upsell: true,
      },
      {
        id: "fallback-maint-pro",
        name: "Pack maintenance Pro",
        description: "Essentiel + monitoring, petites évolutions et priorité support.",
        category: "maintenance",
        unit: "mois",
        unitPrice: 95_000,
        upsell: true,
      },
    ];
  }

  return packs.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
    unit: i.unit,
    unitPrice: i.unitPrice,
    upsell: i.category === "maintenance" || i.unit === "mois",
  }));
}

export async function requestPortalOffer(input: {
  portalClientId: string;
  offerId: string;
  offerName: string;
  message?: string | null;
}): Promise<{ leadId: string | null; ok: boolean }> {
  const client = await withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      company: string | null;
    }>(
      `SELECT id, name, email, phone, company FROM clients
       WHERE portal_client_id = $1 LIMIT 1`,
      [input.portalClientId],
    );
    return rows[0] ?? null;
  });

  if (!client) {
    throw new Error("Client introuvable.");
  }

  const lead = await createLead({
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    source: "manual",
    status: "new",
    service: input.offerName,
    message:
      input.message?.trim() ||
      `Demande portail client — offre « ${input.offerName} » (${input.offerId})`,
    metadata: {
      portalUpsell: true,
      offerId: input.offerId,
      portalClientId: input.portalClientId,
      clientId: client.id,
    },
  });

  if (!lead) throw new Error("Impossible de créer la demande.");
  return { leadId: lead.id, ok: true };
}
