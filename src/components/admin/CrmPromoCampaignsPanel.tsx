"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Plus } from "lucide-react";
import type { PromoAudiencePreview, PromoCampaign } from "@/lib/promo-campaigns";
import {
  createPromoCampaignApi,
  fetchPromoAudiencePreview,
  fetchPromoCampaigns,
  sendPromoCampaignApi,
  syncPromoCampaignApi,
  updatePromoCampaignApi,
} from "@/lib/marketing-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<PromoCampaign["status"], string> = {
  draft: "Brouillon",
  active: "Active",
  ended: "Terminée",
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function CrmPromoCampaignsPanel() {
  const [campaigns, setCampaigns] = useState<PromoCampaign[]>([]);
  const [audience, setAudience] = useState<PromoAudiencePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { alert } = useDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, aud] = await Promise.all([
        fetchPromoCampaigns(),
        fetchPromoAudiencePreview(),
      ]);
      setCampaigns(list);
      setAudience(aud);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    id: string,
    action: () => Promise<string | void>,
  ) {
    setBusyId(id);
    setError("");
    try {
      const msg = await action();
      await load();
      if (msg) await alert({ title: "OK", message: msg });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-text">
            Relances promotionnelles sur devis tièdes + opt-in (newsletter ou lead). Cron :{" "}
            <code className="text-xs">/api/cron/promo-campaigns</code>
          </p>
          <p className="mt-1 text-xs text-gray-text">
            Audience actuelle : <strong>{audience.length}</strong> contact(s) éligible(s)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle campagne
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/40 bg-white px-6 py-10 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-gray-text" aria-hidden />
          <p className="mt-3 text-sm text-gray-text">Aucune campagne pour le moment.</p>
        </div>
      ) : (
        campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      campaign.status === "active" && "bg-emerald-100 text-emerald-800",
                      campaign.status === "draft" && "bg-gray/30 text-gray-text",
                      campaign.status === "ended" && "bg-amber-100 text-amber-800",
                    )}
                  >
                    {STATUS_LABELS[campaign.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground">{campaign.offerTitle}</p>
                <p className="mt-1 text-xs text-gray-text">
                  {new Date(campaign.startsAt).toLocaleString("fr-FR")} →{" "}
                  {new Date(campaign.endsAt).toLocaleString("fr-FR")}
                </p>
              </div>
              {campaign.stats && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-gray-text">Éligibles</dt>
                    <dd className="font-semibold">{campaign.stats.eligible}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-text">Envoyés</dt>
                    <dd className="font-semibold">{campaign.stats.sent}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-text">Confirmés</dt>
                    <dd className="font-semibold">{campaign.stats.confirmed}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-text">Clics</dt>
                    <dd className="font-semibold">{campaign.stats.clicked}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {campaign.status === "draft" && (
                <button
                  type="button"
                  disabled={busyId === campaign.id}
                  onClick={() =>
                    void runAction(campaign.id, async () => {
                      await updatePromoCampaignApi(campaign.id, { status: "active" });
                      return "Campagne activée.";
                    })
                  }
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Activer
                </button>
              )}
              {campaign.status !== "ended" && (
                <>
                  <button
                    type="button"
                    disabled={busyId === campaign.id}
                    onClick={() =>
                      void runAction(campaign.id, async () => {
                        const r = await syncPromoCampaignApi(campaign.id);
                        return `${r.added} inscription(s) ajoutée(s).`;
                      })
                    }
                    className="rounded-lg border border-gray/50 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    Sync audience
                  </button>
                  {campaign.status === "active" && (
                    <button
                      type="button"
                      disabled={busyId === campaign.id}
                      onClick={() =>
                        void runAction(campaign.id, async () => {
                          const r = await sendPromoCampaignApi(campaign.id);
                          return `${r.sent} envoyé(s), ${r.skipped} ignoré(s).`;
                        })
                      }
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Envoyer emails
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === campaign.id}
                    onClick={() =>
                      void runAction(campaign.id, async () => {
                        await updatePromoCampaignApi(campaign.id, { status: "ended" });
                        return "Campagne terminée.";
                      })
                    }
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-50"
                  >
                    Terminer
                  </button>
                </>
              )}
            </div>
          </article>
        ))
      )}

      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      await createPromoCampaignApi({
        name: String(data.get("name")),
        offerTitle: String(data.get("offerTitle")),
        offerDescription: String(data.get("offerDescription") || ""),
        startsAt: fromLocalInputValue(String(data.get("startsAt"))),
        endsAt: fromLocalInputValue(String(data.get("endsAt"))),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-foreground">Nouvelle campagne promo</h2>
        <div className="mt-4 space-y-3">
          <input
            name="name"
            required
            placeholder="Nom interne *"
            className="w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
          />
          <input
            name="offerTitle"
            required
            placeholder="Titre de l’offre *"
            className="w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
          />
          <textarea
            name="offerDescription"
            rows={3}
            placeholder="Description de l’offre"
            className="w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-gray-text">
              Début
              <input
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={toLocalInputValue(now.toISOString())}
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-xs text-gray-text">
              Fin
              <input
                name="endsAt"
                type="datetime-local"
                required
                defaultValue={toLocalInputValue(end.toISOString())}
                className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5 text-sm"
              />
            </label>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray/50 py-2.5 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Créer
          </button>
        </div>
      </form>
    </div>
  );
}
