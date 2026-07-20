"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CONTRACT_PIPELINE_COLUMNS,
  CONTRACT_STATUS_LABELS,
} from "@/content/contracts-labels";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import { fetchCrmClients } from "@/lib/clients-api";
import type { Contract } from "@/lib/contracts";
import {
  createAmendmentApi,
  createContractApi,
  fetchContracts,
  sendContractForEsignApi,
  sendContractForNativeSignApi,
  updateContractApi,
} from "@/lib/contracts-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { FileSignature, Loader2, PenLine, Plus } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmContractsPanel() {
  const { prompt, alert } = useDialog();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [esignBusy, setEsignBusy] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    title: "",
    startDate: "",
    endDate: "",
    amount: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsData, clientsData] = await Promise.all([
        fetchContracts(),
        fetchCrmClients(),
      ]);
      setContracts(contractsData);
      setClients(clientsData.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createContractApi({
        clientId: form.clientId,
        title: form.title,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        amount: form.amount ? Number(form.amount) : null,
      });
      setContracts((prev) => [created, ...prev]);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  async function advanceStatus(contract: Contract) {
    const flow: Record<string, string> = {
      draft: "sent",
      sent: "signed",
      signed: "linked",
    };
    const next = flow[contract.status];
    if (!next) return;
    const updated = await updateContractApi(contract.id, { status: next });
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function addAmendment(contract: Contract) {
    const title = await prompt({
      title: "Nouvel avenant",
      message: "Titre de l'avenant",
      placeholder: "Ex. Prolongation de délai",
    });
    if (!title?.trim()) return;
    try {
      await createAmendmentApi(contract.id, { title: title.trim() });
      setSelected(contract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avenant impossible.");
    }
  }

  async function sendForNative(contract: Contract) {
    const email = await prompt({
      title: "Signature SD CREATIV",
      message: "Email du signataire (lien magique + OTP)",
      label: "Email",
      inputType: "email",
      defaultValue: contract.esignSignerEmail ?? "",
      placeholder: "client@exemple.com",
      confirmLabel: "Envoyer",
    });
    if (!email?.trim()) return;
    setNativeBusy(true);
    setError("");
    try {
      const result = await sendContractForNativeSignApi(contract.id, {
        signerEmail: email.trim(),
      });
      setContracts((prev) =>
        prev.map((c) => (c.id === result.contract.id ? result.contract : c)),
      );
      setSelected(result.contract);
      await alert({
        title: "Invitation envoyée",
        message: `Lien de signature :\n${result.signUrl}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi signature impossible.");
    } finally {
      setNativeBusy(false);
    }
  }

  async function sendForEsign(contract: Contract) {
    const email = await prompt({
      title: "Signature Yousign (forte valeur)",
      message: "Email du signataire — prestataire tiers eIDAS",
      label: "Email",
      inputType: "email",
      defaultValue: contract.esignSignerEmail ?? "",
      placeholder: "client@exemple.com",
      confirmLabel: "Envoyer",
    });
    if (!email?.trim()) return;
    setEsignBusy(true);
    setError("");
    try {
      const updated = await sendContractForEsignApi(contract.id, {
        signerEmail: email.trim(),
        signerName: contract.clientName,
      });
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelected(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi signature impossible.");
    } finally {
      setEsignBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Contrats & avenants</h2>
          <p className="text-sm text-gray-text">
            Cycle de vie : brouillon → envoyé → signé → lié au projet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau contrat
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Client</span>
              <select className={fieldClass} value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} required>
                <option value="">Sélectionner…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Titre</span>
              <input className={fieldClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Début</span>
              <input type="date" className={fieldClass} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Fin (échéance)</span>
              <input type="date" className={fieldClass} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">Montant (FCFA)</span>
              <input type="number" className={fieldClass} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">Créer</button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {CONTRACT_PIPELINE_COLUMNS.map((status) => {
          const column = contracts.filter((c) => c.status === status);
          return (
            <div key={status} className="rounded-2xl border border-gray/50 bg-gray/20 p-3">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-text">
                {CONTRACT_STATUS_LABELS[status]} ({column.length})
              </h3>
              <div className="space-y-2">
                {column.map((contract) => (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => setSelected(contract)}
                    className={cn(
                      "w-full rounded-xl border bg-white p-3 text-left text-sm shadow-sm transition hover:border-primary/40",
                      selected?.id === contract.id && "border-primary ring-2 ring-primary/20",
                    )}
                  >
                    <p className="font-semibold">{contract.reference}</p>
                    <p className="mt-1 truncate text-gray-text">{contract.title}</p>
                    <p className="mt-1 text-xs">{contract.clientName}</p>
                    {contract.endDate && (
                      <p className="mt-1 text-xs text-amber-700">Échéance {contract.endDate}</p>
                    )}
                    {contract.signatureProvider === "yousign" && (
                      <p className="mt-1 text-[10px] font-medium text-primary">Yousign</p>
                    )}
                    {contract.signatureProvider === "native" && (
                      <p className="mt-1 text-[10px] font-medium text-emerald-700">SD CREATIV</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="font-bold">{selected.title}</h3>
          <p className="text-sm text-gray-text mt-1">
            {selected.clientName} — {selected.amount ? formatInvoiceAmount(selected.amount) : "Montant non défini"}
          </p>
          {selected.esignSignerEmail && (
            <p className="mt-2 text-xs text-gray-text">
              Signature ({selected.signatureProvider ?? "—"}) : {selected.esignSignerEmail}
              {selected.esignSentAt
                ? ` — envoyé le ${new Date(selected.esignSentAt).toLocaleDateString("fr-FR")}`
                : ""}
              {selected.esignCompletedAt
                ? ` — signé le ${new Date(selected.esignCompletedAt).toLocaleDateString("fr-FR")}`
                : ""}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {["draft", "sent", "signed"].includes(selected.status) && (
              <button type="button" onClick={() => void advanceStatus(selected)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                Étape suivante
              </button>
            )}
            {["draft", "sent"].includes(selected.status) && (
              <>
                <button
                  type="button"
                  disabled={nativeBusy || esignBusy}
                  onClick={() => void sendForNative(selected)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-60"
                >
                  {nativeBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <FileSignature className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Signer (SD CREATIV)
                </button>
                <button
                  type="button"
                  disabled={esignBusy || nativeBusy}
                  onClick={() => void sendForEsign(selected)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
                >
                  {esignBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <PenLine className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Yousign (forte valeur)
                </button>
              </>
            )}
            <button type="button" onClick={() => void addAmendment(selected)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Ajouter un avenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
