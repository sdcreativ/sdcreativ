"use client";

import { useEffect, useMemo, useState } from "react";
import { formatProjectBudget, formatProjectDate } from "@/content/projects-labels";
import { fetchCrmClientById, updateCrmClient } from "@/lib/clients-api";
import {
  PAYMENT_STATUS_LABELS,
  type PaymentScheduleDraftItem,
  type PortalPaymentStatus,
  createDefaultScheduleDraft,
  paidAmountFromScheduleDraft,
  paymentScheduleDraftFromMetadata,
  serializePaymentScheduleDraft,
} from "@/lib/client-portal-payments";
import type { Project } from "@/lib/projects";
import {
  fetchProjectPaymentMilestonesApi,
  replaceProjectPaymentMilestonesApi,
  updateProjectApi,
} from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2 } from "lucide-react";

const fieldClass =
  "w-full rounded-lg border border-gray/60 bg-white px-2.5 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  project: Project;
};

function newDraftItem(): PaymentScheduleDraftItem {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: "",
    amount: "",
    status: "pending",
    date: "",
  };
}

export function ProjectPaymentScheduleEditor({ project }: Props) {
  const [items, setItems] = useState<PaymentScheduleDraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSaved(false);
    void (async () => {
      try {
        const milestones = await fetchProjectPaymentMilestonesApi(project.id);
        if (milestones.length) {
          setItems(
            milestones.map((m) => ({
              id: m.id,
              label: m.label,
              amount: String(m.amount),
              status: m.status,
              date: m.dueDate ?? "",
            })),
          );
          return;
        }
      } catch {
        /* fallback metadata */
      }
      try {
        const client = await fetchCrmClientById(project.clientId);
        const paid =
          typeof client.metadata?.paidAmount === "number" ? client.metadata.paidAmount : undefined;
        setItems(
          paymentScheduleDraftFromMetadata(project.metadata?.paymentSchedule, {
            budget: project.budget,
            dueDate: project.dueDate,
            paidAmount: paid,
          }),
        );
      } catch {
        setItems(
          paymentScheduleDraftFromMetadata(project.metadata?.paymentSchedule, {
            budget: project.budget,
            dueDate: project.dueDate,
          }),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [project.id, project.clientId, project.budget, project.dueDate, project.metadata?.paymentSchedule]);

  const scheduleTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const amount = Number(item.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [items],
  );

  const paidTotal = useMemo(() => paidAmountFromScheduleDraft(items), [items]);
  const budget = project.budget ?? 0;
  const budgetMismatch = budget > 0 && scheduleTotal !== budget;

  function updateItem(id: string, patch: Partial<PaymentScheduleDraftItem>) {
    setSaved(false);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeItem(id: string) {
    setSaved(false);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addItem() {
    setSaved(false);
    setItems((prev) => [...prev, newDraftItem()]);
  }

  function resetDefault() {
    setSaved(false);
    setItems(
      createDefaultScheduleDraft({
        budget: project.budget,
        dueDate: project.dueDate,
        paidAmount: paidTotal,
      }),
    );
  }

  async function handleSave() {
    setError("");
    const serialized = serializePaymentScheduleDraft(items);
    if (serialized.length === 0) {
      setError("Ajoutez au moins une échéance valide (libellé + montant).");
      return;
    }

    setSaving(true);
    try {
      const paidAmount = paidAmountFromScheduleDraft(items);
      const payload = serialized.map((s) => ({
        label: s.label,
        amount: s.amount,
        status: s.status,
        dueDate: s.date && s.date !== "—" ? s.date : null,
      }));
      try {
        await replaceProjectPaymentMilestonesApi(project.id, payload);
      } catch {
        // Fallback metadata si table pas encore migrée
        await updateProjectApi(project.id, {
          metadata: { paymentSchedule: serialized },
        });
      }
      await updateCrmClient(project.clientId, {
        metadata: { paidAmount },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement de l&apos;échéancier…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary-light/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-foreground">Échéancier portail client</h3>
          <p className="mt-1 text-xs text-gray-text">
            Synchronisé avec la page Paiements de l&apos;espace client.
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefault}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Modèle 50/50
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/70 p-3 text-xs">
        <div>
          <dt className="text-gray-text">Budget projet</dt>
          <dd className="font-semibold text-foreground">{formatProjectBudget(project.budget)}</dd>
        </div>
        <div>
          <dt className="text-gray-text">Livraison</dt>
          <dd className="font-semibold text-foreground">{formatProjectDate(project.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-gray-text">Total échéancier</dt>
          <dd className={cn("font-semibold", budgetMismatch ? "text-accent" : "text-foreground")}>
            {new Intl.NumberFormat("fr-FR").format(scheduleTotal)} FCFA
          </dd>
        </div>
        <div>
          <dt className="text-gray-text">Montant payé (auto)</dt>
          <dd className="font-semibold text-emerald-600">
            {new Intl.NumberFormat("fr-FR").format(paidTotal)} FCFA
          </dd>
        </div>
      </dl>

      {budgetMismatch && (
        <p className="mt-2 text-xs text-accent">
          Le total des échéances ({scheduleTotal.toLocaleString("fr-FR")} FCFA) diffère du budget (
          {budget.toLocaleString("fr-FR")} FCFA).
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={item.id} className="rounded-xl border border-gray/40 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-text">Échéance {index + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={items.length <= 1}
                className="rounded-lg p-1 text-gray-text hover:bg-gray-light hover:text-accent disabled:opacity-30"
                aria-label="Supprimer l'échéance"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder="Libellé (ex. Acompte)"
                className={fieldClass}
              />
              <input
                type="number"
                min={0}
                value={item.amount}
                onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                placeholder="Montant FCFA"
                className={fieldClass}
              />
              <select
                value={item.status}
                onChange={(e) =>
                  updateItem(item.id, { status: e.target.value as PortalPaymentStatus })
                }
                className={fieldClass}
                aria-label="Statut du paiement"
              >
                {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                value={item.date}
                onChange={(e) => updateItem(item.id, { date: e.target.value })}
                placeholder="Date (ex. 15 mai 2026)"
                className={fieldClass}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={addItem}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Ajouter une échéance
      </button>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
      {saved && !error && (
        <p className="mt-3 text-sm font-medium text-emerald-600">Échéancier enregistré.</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer l'échéancier"}
      </button>
    </div>
  );
}
