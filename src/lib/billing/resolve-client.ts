import { createClient, createClientFromLead, getClientById, updateClient } from "@/lib/clients";
import type { Quote } from "@/lib/quotes";
import { updateQuote } from "@/lib/quotes";

function slugifyPortalId(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

async function ensurePortalClientId(clientId: string): Promise<string> {
  const client = await getClientById(clientId);
  if (!client) {
    throw new Error("Client introuvable.");
  }
  if (client.portalClientId) {
    return client.portalClientId;
  }

  const base = slugifyPortalId(client.company || client.name || client.email.split("@")[0] || "client");
  const portalClientId = `${base}-${client.id.slice(0, 8)}`;
  await updateClient(clientId, { portalClientId });
  return portalClientId;
}

export async function resolveClientForQuote(quote: Quote): Promise<{
  clientId: string;
  portalClientId: string;
}> {
  if (quote.clientId) {
    const portalClientId = await ensurePortalClientId(quote.clientId);
    return { clientId: quote.clientId, portalClientId };
  }

  if (quote.leadId) {
    const client = await createClientFromLead(quote.leadId);
    if (!client) {
      throw new Error("Impossible de créer le client à partir du lead.");
    }
    await updateQuote(quote.id, { clientId: client.id });
    const portalClientId = client.portalClientId
      ? client.portalClientId
      : await ensurePortalClientId(client.id);
    return { clientId: client.id, portalClientId };
  }

  const slug = slugifyPortalId(quote.company || quote.name);
  const client = await createClient({
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    company: quote.company,
    status: "active",
    portalClientId: slug || null,
    notes: `Créé automatiquement pour le devis ${quote.reference}.`,
    metadata: { createdFromQuoteId: quote.id },
  });

  await updateQuote(quote.id, { clientId: client.id });
  const portalClientId = client.portalClientId
    ? client.portalClientId
    : await ensurePortalClientId(client.id);

  return { clientId: client.id, portalClientId };
}
