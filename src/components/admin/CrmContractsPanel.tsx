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
  createMaintenanceSubscriptionApi,
  fetchContracts,
  sendContractForEsignApi,
  sendContractForNativeSignApi,
  updateContractApi,
} from "@/lib/contracts-api";
import { maintenancePlans } from "@/content/maintenance-plans";
import {
  DEFAULT_MAINTENANCE_TERMS,
  formatDateLong,
  MAINTENANCE_INTERVAL_LABELS,
  maintenanceLevel,
  maintenancePricing,
  maintenanceSchedule,
  readMaintenanceTerms,
  ttcFromHt,
  type MaintenanceLevel,
} from "@/lib/maintenance-contract";
import type { SubscriptionInterval } from "@/content/subscriptions-labels";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import { FileSignature, FileText, Loader2, PenLine, Plus, Repeat } from "lucide-react";

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
  const [subscriptionBusy, setSubscriptionBusy] = useState(false);
  const [form, setForm] = useState({
    kind: "standard" as "standard" | "maintenance",
    clientId: "",
    title: "",
    startDate: "",
    endDate: "",
    amount: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    level: DEFAULT_MAINTENANCE_TERMS.level as MaintenanceLevel,
    siteName: "",
    siteUrl: "",
    includedMonths: String(DEFAULT_MAINTENANCE_TERMS.includedMonths),
    billingInterval: DEFAULT_MAINTENANCE_TERMS.billingInterval as SubscriptionInterval,
    priceHt: "",
    vatRate: String(DEFAULT_MAINTENANCE_TERMS.vatRate),
    noticeDays: String(DEFAULT_MAINTENANCE_TERMS.noticeDays),
  });
  const isMaintenance = form.kind === "maintenance";
  const maintenancePriceTtc =
    Number(maintenanceForm.priceHt) > 0
      ? ttcFromHt(Number(maintenanceForm.priceHt), Number(maintenanceForm.vatRate) || 0)
      : null;

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
        // Maintenance : le montant du contrat est le prix TTC d'une période.
        amount: isMaintenance ? maintenancePriceTtc : form.amount ? Number(form.amount) : null,
        maintenance: isMaintenance
          ? {
              level: maintenanceForm.level,
              siteName: maintenanceForm.siteName,
              siteUrl: maintenanceForm.siteUrl.trim() || null,
              includedMonths: Number(maintenanceForm.includedMonths),
              billingInterval: maintenanceForm.billingInterval,
              priceHt: Number(maintenanceForm.priceHt),
              vatRate: Number(maintenanceForm.vatRate),
              noticeDays: Number(maintenanceForm.noticeDays),
            }
          : null,
      });
      setContracts((prev) => [created, ...prev]);
      setSelected(created);
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
    if (selected?.id === updated.id) setSelected(updated);
  }

  async function createSubscription(contract: Contract) {
    setSubscriptionBusy(true);
    setError("");
    try {
      const result = await createMaintenanceSubscriptionApi(contract.id);
      setContracts((prev) => prev.map((c) => (c.id === result.contract.id ? result.contract : c)));
      setSelected(result.contract);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création de l'abonnement impossible.");
    } finally {
      setSubscriptionBusy(false);
    }
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
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type de contrat">
            {(
              [
                ["standard", "Contrat simple"],
                ["maintenance", "Contrat de maintenance"],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={form.kind === kind}
                onClick={() => setForm((f) => ({ ...f, kind }))}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-sm font-medium",
                  form.kind === kind ? "border-primary bg-primary/10 text-primary" : "border-gray/60",
                )}
              >
                {label}
              </button>
            ))}
          </div>
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
              <input
                className={fieldClass}
                value={form.title}
                placeholder={isMaintenance ? "Contrat de maintenance — site vitrine" : undefined}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{isMaintenance ? "Prise d'effet (mise en ligne)" : "Début"}</span>
              <input type="date" className={fieldClass} value={form.startDate} required={isMaintenance} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </label>
            {!isMaintenance && (
              <>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Fin (échéance)</span>
                  <input type="date" className={fieldClass} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium">Montant (FCFA)</span>
                  <input type="number" className={fieldClass} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                </label>
              </>
            )}
          </div>
          {isMaintenance && (
            <fieldset className="grid gap-4 rounded-xl border border-gray/50 p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-semibold">Maintenance</legend>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Site maintenu</span>
                <input className={fieldClass} value={maintenanceForm.siteName} placeholder="Site vitrine Exemple SARL" required onChange={(e) => setMaintenanceForm((m) => ({ ...m, siteName: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Adresse du site (facultatif)</span>
                <input className={fieldClass} value={maintenanceForm.siteUrl} placeholder="https://…" onChange={(e) => setMaintenanceForm((m) => ({ ...m, siteUrl: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Niveau de service</span>
                <select className={fieldClass} value={maintenanceForm.level} onChange={(e) => setMaintenanceForm((m) => ({ ...m, level: e.target.value as MaintenanceLevel }))}>
                  {maintenancePlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — réponse {p.responseTime}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Mois inclus dans la création</span>
                <input type="number" min={0} max={36} className={fieldClass} value={maintenanceForm.includedMonths} required onChange={(e) => setMaintenanceForm((m) => ({ ...m, includedMonths: e.target.value }))} />
              </label>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Facturation choisie par le client</span>
                <div className="flex gap-2">
                  {(["monthly", "yearly"] as const).map((interval) => (
                    <button
                      key={interval}
                      type="button"
                      aria-pressed={maintenanceForm.billingInterval === interval}
                      onClick={() => setMaintenanceForm((m) => ({ ...m, billingInterval: interval }))}
                      className={cn(
                        "flex-1 rounded-xl border px-3 py-2 text-sm",
                        maintenanceForm.billingInterval === interval ? "border-primary bg-primary/10 font-semibold text-primary" : "border-gray/60",
                      )}
                    >
                      {interval === "monthly" ? "Mensuelle" : "Annuelle"}
                    </button>
                  ))}
                </div>
              </div>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">
                  Prix HT par {MAINTENANCE_INTERVAL_LABELS[maintenanceForm.billingInterval].per} (FCFA)
                </span>
                <input type="number" min={1} className={fieldClass} value={maintenanceForm.priceHt} required onChange={(e) => setMaintenanceForm((m) => ({ ...m, priceHt: e.target.value }))} />
                {maintenancePriceTtc != null && (
                  <span className="block text-xs text-gray-text">
                    Soit {formatInvoiceAmount(maintenancePriceTtc)} TTC par {MAINTENANCE_INTERVAL_LABELS[maintenanceForm.billingInterval].per}
                  </span>
                )}
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">TVA (%)</span>
                <input type="number" min={0} max={100} step="0.01" className={fieldClass} value={maintenanceForm.vatRate} required onChange={(e) => setMaintenanceForm((m) => ({ ...m, vatRate: e.target.value }))} />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Préavis de résiliation (jours)</span>
                <input type="number" min={0} max={180} className={fieldClass} value={maintenanceForm.noticeDays} required onChange={(e) => setMaintenanceForm((m) => ({ ...m, noticeDays: e.target.value }))} />
              </label>
              <p className="text-xs text-gray-text sm:col-span-2">
                L&apos;avantage promis au client (ex. -50 % la 2ᵉ année avec son code) est repris automatiquement dans le contrat.
                À la signature, l&apos;abonnement est créé : 1ʳᵉ facture (brouillon) à la fin de la période incluse.
              </p>
            </fieldset>
          )}
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
          {(() => {
            const terms = readMaintenanceTerms(selected.metadata);
            if (!terms) return null;
            const price = maintenancePricing(terms);
            const per = MAINTENANCE_INTERVAL_LABELS[terms.billingInterval].per;
            const paidFrom = selected.startDate ? maintenanceSchedule(terms, selected.startDate).paidFrom : null;
            return (
              <dl className="mt-3 grid gap-x-4 gap-y-1 rounded-xl bg-gray-light/40 p-3 text-xs sm:grid-cols-[max-content_1fr]">
                <dt className="text-gray-text">Maintenance</dt>
                <dd>{maintenanceLevel(terms.level).name} — {terms.siteName}</dd>
                <dt className="text-gray-text">Facturation</dt>
                <dd>
                  {formatInvoiceAmount(price.ht)} HT / {per} ({formatInvoiceAmount(price.ttc)} TTC)
                  {paidFrom ? ` à partir du ${formatDateLong(paidFrom)}` : ""}
                </dd>
                {terms.benefit && (
                  <>
                    <dt className="text-gray-text">Avantage</dt>
                    <dd>
                      -{terms.benefit.percent} % du {formatDateLong(terms.benefit.startsOn)} au {formatDateLong(terms.benefit.endsOn)} ({terms.benefit.promoCode})
                    </dd>
                  </>
                )}
                <dt className="text-gray-text">Abonnement</dt>
                <dd className={terms.subscriptionId ? "text-emerald-700" : "text-amber-700"}>
                  {terms.subscriptionId ? "Créé — visible dans Abonnements" : "Créé automatiquement à la signature"}
                </dd>
              </dl>
            );
          })()}
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
            <a
              href={`/api/admin/contracts/${selected.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Voir le contrat (PDF)
            </a>
            {(() => {
              const terms = readMaintenanceTerms(selected.metadata);
              if (!terms || terms.subscriptionId || !["signed", "linked"].includes(selected.status)) return null;
              return (
                <button
                  type="button"
                  disabled={subscriptionBusy}
                  onClick={() => void createSubscription(selected)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-60"
                >
                  {subscriptionBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Repeat className="h-3.5 w-3.5" aria-hidden />}
                  Créer l&apos;abonnement
                </button>
              );
            })()}
            <button type="button" onClick={() => void addAmendment(selected)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Ajouter un avenant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
