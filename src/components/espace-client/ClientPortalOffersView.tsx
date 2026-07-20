"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { formatMoney } from "@/lib/currencies";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unitPrice: number;
  upsell: boolean;
};

export function ClientPortalOffersView() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/espace-client/offers", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { offers?: Offer[] }) => setOffers(json.offers ?? []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  async function requestOffer(offer: Offer) {
    setRequesting(offer.id);
    setMessage("");
    try {
      const res = await fetch("/api/espace-client/offers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: offer.id, offerName: offer.name }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Demande impossible.");
      setMessage(`Demande envoyée pour « ${offer.name} ». L’équipe vous recontacte.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Demande impossible.");
    } finally {
      setRequesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement des offres…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Packs & maintenance</h2>
        <p className="text-sm text-gray-text">
          Upsell catalogue — maintenance et packs après mise en ligne de votre projet.
        </p>
      </div>

      {message && (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => (
          <li
            key={offer.id}
            className="flex flex-col rounded-2xl border border-gray/30 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground">{offer.name}</h3>
              {offer.upsell && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Upsell
                </span>
              )}
            </div>
            {offer.description && (
              <p className="mt-2 flex-1 text-sm text-gray-text">{offer.description}</p>
            )}
            <p className="mt-3 text-sm font-bold text-foreground">
              {formatMoney(offer.unitPrice, "XOF")}
              <span className="ml-1 text-xs font-normal text-gray-text">/ {offer.unit}</span>
            </p>
            <button
              type="button"
              disabled={Boolean(requesting)}
              onClick={() => void requestOffer(offer)}
              className="mt-3 rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {requesting === offer.id ? "Envoi…" : "Demander cette offre"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
