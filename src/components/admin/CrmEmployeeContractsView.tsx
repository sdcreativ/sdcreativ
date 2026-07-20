"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPLOYEE_COMPENSATION_PERIOD_LABELS,
  EMPLOYEE_COMPENSATION_PERIODS,
  EMPLOYEE_CONTRACT_STATUS_LABELS,
  EMPLOYEE_CONTRACT_STATUS_STYLES,
  EMPLOYEE_CONTRACT_STATUSES,
  EMPLOYEE_CONTRACT_TYPE_LABELS,
  EMPLOYEE_CONTRACT_TYPES,
  FIXED_TERM_CONTRACT_TYPES,
  type EmployeeContractStatus,
  type EmployeeContractType,
} from "@/content/employee-contracts-labels";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES, formatMoney } from "@/lib/currencies";
import type { EmployeeContract } from "@/lib/employee-contracts";
import {
  createEmployeeContractApi,
  deleteEmployeeContractApi,
  fetchEmployeeContracts,
  sendEmployeeContractForEsignApi,
  sendEmployeeContractForNativeSignApi,
  updateEmployeeContractApi,
} from "@/lib/employee-contracts-api";
import { fetchTeamMembers } from "@/lib/crm-users-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  FileSignature,
  Loader2,
  Pencil,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type FormState = {
  userId: string;
  contractType: EmployeeContractType;
  title: string;
  jobTitle: string;
  department: string;
  workLocation: string;
  startDate: string;
  endDate: string;
  trialEndDate: string;
  weeklyHours: string;
  compensationAmount: string;
  compensationCurrency: (typeof SUPPORTED_CURRENCIES)[number];
  compensationPeriod: (typeof EMPLOYEE_COMPENSATION_PERIODS)[number];
  reminderDaysBefore: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  userId: "",
  contractType: "cdi",
  title: "",
  jobTitle: "",
  department: "",
  workLocation: "",
  startDate: "",
  endDate: "",
  trialEndDate: "",
  weeklyHours: "40",
  compensationAmount: "",
  compensationCurrency: "XOF",
  compensationPeriod: "monthly",
  reminderDaysBefore: "30",
  notes: "",
});

function formatDateFr(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function nextStatus(status: EmployeeContractStatus): EmployeeContractStatus | null {
  const flow: Partial<Record<EmployeeContractStatus, EmployeeContractStatus>> = {
    draft: "pending_signature",
    pending_signature: "signed",
    signed: "active",
    active: "ended",
  };
  return flow[status] ?? null;
}

export function CrmEmployeeContractsView() {
  const { confirm, prompt, alert } = useDialog();
  const [contracts, setContracts] = useState<EmployeeContract[]>([]);
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signBusyId, setSignBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeeContractType | "">("");
  const [statusFilter, setStatusFilter] = useState<EmployeeContractStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, team] = await Promise.all([
        fetchEmployeeContracts({
          contractType: typeFilter || undefined,
          status: statusFilter || undefined,
        }),
        fetchTeamMembers(),
      ]);
      setContracts(list);
      setMembers(team.filter((m) => !m.id.startsWith("legacy-")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const expiring = useMemo(
    () =>
      contracts.filter(
        (c) =>
          c.daysUntilEnd != null &&
          c.daysUntilEnd <= c.reminderDaysBefore &&
          c.daysUntilEnd >= 0,
      ),
    [contracts],
  );

  const counts = useMemo(() => {
    const byType = Object.fromEntries(EMPLOYEE_CONTRACT_TYPES.map((t) => [t, 0])) as Record<
      EmployeeContractType,
      number
    >;
    let active = 0;
    for (const c of contracts) {
      byType[c.contractType] += 1;
      if (c.status === "active") active += 1;
    }
    return { byType, active, total: contracts.length };
  }, [contracts]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(contract: EmployeeContract) {
    setEditingId(contract.id);
    setForm({
      userId: contract.userId,
      contractType: contract.contractType,
      title: contract.title,
      jobTitle: contract.jobTitle ?? "",
      department: contract.department ?? "",
      workLocation: contract.workLocation ?? "",
      startDate: contract.startDate ?? "",
      endDate: contract.endDate ?? "",
      trialEndDate: contract.trialEndDate ?? "",
      weeklyHours: contract.weeklyHours != null ? String(contract.weeklyHours) : "",
      compensationAmount:
        contract.compensationAmount != null ? String(contract.compensationAmount) : "",
      compensationCurrency:
        (SUPPORTED_CURRENCIES.includes(
          contract.compensationCurrency as (typeof SUPPORTED_CURRENCIES)[number],
        )
          ? contract.compensationCurrency
          : "XOF") as FormState["compensationCurrency"],
      compensationPeriod: contract.compensationPeriod,
      reminderDaysBefore: String(contract.reminderDaysBefore),
      notes: contract.notes ?? "",
    });
    setShowForm(true);
  }

  function defaultTitle(type: EmployeeContractType, jobTitle: string): string {
    const typeLabel = EMPLOYEE_CONTRACT_TYPE_LABELS[type];
    return jobTitle.trim() ? `Contrat ${typeLabel} — ${jobTitle.trim()}` : `Contrat ${typeLabel}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId) {
      setError("Sélectionnez un collaborateur.");
      return;
    }
    if (FIXED_TERM_CONTRACT_TYPES.includes(form.contractType) && !form.endDate) {
      setError("Une date de fin est requise pour ce type de contrat.");
      return;
    }

    setSaving(true);
    setError("");
    const title = form.title.trim() || defaultTitle(form.contractType, form.jobTitle);
    const payload = {
      userId: form.userId,
      contractType: form.contractType,
      title,
      jobTitle: form.jobTitle.trim() || null,
      department: form.department.trim() || null,
      workLocation: form.workLocation.trim() || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      trialEndDate: form.trialEndDate || null,
      weeklyHours: form.weeklyHours ? Number(form.weeklyHours) : null,
      compensationAmount: form.compensationAmount ? Number(form.compensationAmount) : null,
      compensationCurrency: form.compensationCurrency,
      compensationPeriod: form.compensationPeriod,
      reminderDaysBefore: form.reminderDaysBefore ? Number(form.reminderDaysBefore) : 30,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { userId: _userId, ...updatePayload } = payload;
        void _userId;
        const updated = await updateEmployeeContractApi(editingId, updatePayload);
        setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createEmployeeContractApi(payload);
        setContracts((prev) => [created, ...prev]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function advance(contract: EmployeeContract) {
    const next = nextStatus(contract.status);
    if (!next) return;
    try {
      const updated = await updateEmployeeContractApi(contract.id, { status: next });
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  function canSendForSignature(contract: EmployeeContract): boolean {
    return contract.status === "draft" || contract.status === "pending_signature";
  }

  async function sendForNative(contract: EmployeeContract) {
    const email = await prompt({
      title: "Signature SD CREATIV",
      message: "Email du collaborateur (lien magique + OTP). Préférez l'email personnel.",
      defaultValue: contract.esignSignerEmail ?? contract.userEmail ?? "",
      placeholder: "prenom@exemple.com",
      confirmLabel: "Envoyer",
    });
    if (!email?.trim()) return;
    setSignBusyId(contract.id);
    setError("");
    try {
      const result = await sendEmployeeContractForNativeSignApi(contract.id, {
        signerEmail: email.trim(),
      });
      setContracts((prev) =>
        prev.map((c) => (c.id === result.contract.id ? result.contract : c)),
      );
      await alert({
        title: "Invitation envoyée",
        message: `Lien de signature (preuve métier) :\n${result.signUrl}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi signature impossible.");
    } finally {
      setSignBusyId(null);
    }
  }

  async function sendForYousign(contract: EmployeeContract) {
    const email = await prompt({
      title: "Signature Yousign (forte valeur)",
      message: "Email du signataire — prestataire eIDAS (recommandé pour CDI / CDD).",
      defaultValue: contract.esignSignerEmail ?? contract.userEmail ?? "",
      placeholder: "prenom@exemple.com",
      confirmLabel: "Envoyer via Yousign",
    });
    if (!email?.trim()) return;
    setSignBusyId(contract.id);
    setError("");
    try {
      const updated = await sendEmployeeContractForEsignApi(contract.id, {
        signerEmail: email.trim(),
        signerName: contract.userName,
      });
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await alert({
        title: "Demande Yousign créée",
        message: `Le collaborateur recevra un email Yousign pour signer ${updated.reference}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi Yousign impossible.");
    } finally {
      setSignBusyId(null);
    }
  }

  async function cancelContract(contract: EmployeeContract) {
    const ok = await confirm({
      title: "Annuler le contrat",
      message: `Annuler ${contract.reference} — ${contract.title} ?`,
      confirmLabel: "Annuler le contrat",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const updated = await updateEmployeeContractApi(contract.id, { status: "cancelled" });
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Annulation impossible.");
    }
  }

  async function removeContract(contract: EmployeeContract) {
    const ok = await confirm({
      title: "Supprimer le contrat",
      message: `Supprimer définitivement ${contract.reference} ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteEmployeeContractApi(contract.id);
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <FileSignature className="h-6 w-6 text-primary" aria-hidden />
            Contrats employés
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-text">
            Stage, CDD, CDI, alternance et autres contrats de l&apos;équipe — suivi des dates,
            rémunération et statut.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nouveau contrat
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contrats" value={String(counts.total)} />
        <StatCard label="Actifs" value={String(counts.active)} accent />
        <StatCard
          label="CDI"
          value={String(counts.byType.cdi)}
          hint={`${counts.byType.cdd} CDD · ${counts.byType.stage} stages`}
        />
        <StatCard
          label="Alternance / apprentissage"
          value={String(counts.byType.alternance + counts.byType.apprentissage)}
        />
      </div>

      {expiring.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Échéances proches ({expiring.length})
          </p>
          <ul className="mt-2 space-y-1">
            {expiring.slice(0, 5).map((c) => (
              <li key={c.id}>
                <strong>{c.userName ?? "Collaborateur"}</strong> — {c.reference} · fin le{" "}
                {formatDateFr(c.endDate)}
                {c.daysUntilEnd != null ? ` (J-${c.daysUntilEnd})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EmployeeContractType | "")}
          className={cn(fieldClass, "max-w-[200px]")}
          aria-label="Filtrer par type"
        >
          <option value="">Tous les types</option>
          {EMPLOYEE_CONTRACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {EMPLOYEE_CONTRACT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EmployeeContractStatus | "")}
          className={cn(fieldClass, "max-w-[200px]")}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {EMPLOYEE_CONTRACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EMPLOYEE_CONTRACT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 rounded-2xl border border-gray/30 bg-gradient-to-br from-gray-light/40 to-white p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            {editingId ? "Modifier le contrat" : "Nouveau contrat"}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-text">Collaborateur</span>
              <select
                required
                disabled={Boolean(editingId)}
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                className={fieldClass}
              >
                <option value="">Sélectionner…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Type</span>
              <select
                value={form.contractType}
                onChange={(e) => {
                  const contractType = e.target.value as EmployeeContractType;
                  setForm((f) => ({
                    ...f,
                    contractType,
                    title: f.title || defaultTitle(contractType, f.jobTitle),
                  }));
                }}
                className={fieldClass}
              >
                {EMPLOYEE_CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYEE_CONTRACT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Intitulé du poste</span>
              <input
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                className={fieldClass}
                placeholder="Ex. Développeur full-stack"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-text">Titre du contrat</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className={fieldClass}
                placeholder="Auto si vide"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Département</span>
              <input
                value={form.department}
                onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                className={fieldClass}
                placeholder="Ex. Technique"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Lieu de travail</span>
              <input
                value={form.workLocation}
                onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
                className={fieldClass}
                placeholder="Ex. Abidjan / Remote"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Date de début</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">
                Date de fin
                {FIXED_TERM_CONTRACT_TYPES.includes(form.contractType) ? " *" : " (optionnel)"}
              </span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Fin de période d&apos;essai</span>
              <input
                type="date"
                value={form.trialEndDate}
                onChange={(e) => setForm((f) => ({ ...f, trialEndDate: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Heures / semaine</span>
              <input
                type="number"
                min={0}
                max={80}
                step={0.5}
                value={form.weeklyHours}
                onChange={(e) => setForm((f) => ({ ...f, weeklyHours: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Rémunération</span>
              <input
                type="number"
                min={0}
                value={form.compensationAmount}
                onChange={(e) => setForm((f) => ({ ...f, compensationAmount: e.target.value }))}
                className={fieldClass}
                placeholder="Montant"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Devise</span>
              <select
                value={form.compensationCurrency}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    compensationCurrency: e.target.value as FormState["compensationCurrency"],
                  }))
                }
                className={fieldClass}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Période</span>
              <select
                value={form.compensationPeriod}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    compensationPeriod: e.target
                      .value as FormState["compensationPeriod"],
                  }))
                }
                className={fieldClass}
              >
                {EMPLOYEE_COMPENSATION_PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {EMPLOYEE_COMPENSATION_PERIOD_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">
                Alerte avant échéance (jours)
              </span>
              <input
                type="number"
                min={1}
                max={365}
                value={form.reminderDaysBefore}
                onChange={(e) => setForm((f) => ({ ...f, reminderDaysBefore: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-gray-text">Notes</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                className={fieldClass}
                placeholder="Clauses particulières, avantages, références internes…"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le contrat"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded-xl border border-gray/50 px-4 py-2.5 text-sm font-medium hover:bg-white"
            >
              Fermer
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Chargement…
        </p>
      ) : contracts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/40 bg-white px-6 py-12 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-gray-text/60" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">Aucun contrat pour le moment</p>
          <p className="mt-1 text-sm text-gray-text">
            Créez le premier contrat (Stage, CDD, CDI, Alternance…).
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {contracts.map((contract) => {
            const statusStyle = EMPLOYEE_CONTRACT_STATUS_STYLES[contract.status];
            const next = nextStatus(contract.status);
            return (
              <li
                key={contract.id}
                className="rounded-2xl border border-gray/25 bg-white p-4 shadow-sm transition-colors hover:border-gray/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {contract.reference}
                      </span>
                      <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {EMPLOYEE_CONTRACT_TYPE_LABELS[contract.contractType]}
                      </span>
                      <span
                        className={cn(
                          "rounded-lg px-2 py-0.5 text-xs font-semibold",
                          statusStyle.bg,
                          statusStyle.text,
                        )}
                      >
                        {EMPLOYEE_CONTRACT_STATUS_LABELS[contract.status]}
                      </span>
                      {contract.signatureProvider === "native" && (
                        <span className="rounded-lg bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                          Signature SD CREATIV
                        </span>
                      )}
                      {contract.signatureProvider === "yousign" && (
                        <span className="rounded-lg bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                          Yousign
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-foreground">{contract.title}</p>
                    <p className="text-sm text-gray-text">
                      {contract.userName ?? "Collaborateur"}
                      {contract.jobTitle ? ` · ${contract.jobTitle}` : ""}
                      {contract.department ? ` · ${contract.department}` : ""}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-text">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {formatDateFr(contract.startDate)} → {formatDateFr(contract.endDate)}
                      </span>
                      {contract.compensationAmount != null && (
                        <span>
                          {formatMoney(
                            contract.compensationAmount,
                            contract.compensationCurrency as (typeof SUPPORTED_CURRENCIES)[number],
                          )}{" "}
                          / {EMPLOYEE_COMPENSATION_PERIOD_LABELS[contract.compensationPeriod].toLowerCase()}
                        </span>
                      )}
                      {contract.weeklyHours != null && <span>{contract.weeklyHours} h/sem.</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {canSendForSignature(contract) && (
                      <>
                        <button
                          type="button"
                          disabled={signBusyId === contract.id}
                          onClick={() => void sendForNative(contract)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                        >
                          <PenLine className="h-3.5 w-3.5" aria-hidden />
                          Signer (SD CREATIV)
                        </button>
                        <button
                          type="button"
                          disabled={signBusyId === contract.id}
                          onClick={() => void sendForYousign(contract)}
                          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                        >
                          <FileSignature className="h-3.5 w-3.5" aria-hidden />
                          Yousign (forte valeur)
                        </button>
                      </>
                    )}
                    {next &&
                      contract.status !== "draft" &&
                      contract.status !== "pending_signature" && (
                        <button
                          type="button"
                          onClick={() => void advance(contract)}
                          className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                        >
                          → {EMPLOYEE_CONTRACT_STATUS_LABELS[next]}
                        </button>
                      )}
                    <button
                      type="button"
                      onClick={() => openEdit(contract)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray/40 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-light/50"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      Modifier
                    </button>
                    {contract.status !== "cancelled" && contract.status !== "ended" && (
                      <button
                        type="button"
                        onClick={() => void cancelContract(contract)}
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Annuler
                      </button>
                    )}
                    {contract.status !== "active" && (
                      <button
                        type="button"
                        onClick={() => void removeContract(contract)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray/30 px-2.5 py-1.5 text-xs text-gray-text hover:bg-gray-light/40"
                        aria-label={`Supprimer ${contract.reference}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
                {contract.notes && (
                  <p className="mt-3 border-t border-gray/15 pt-3 text-xs leading-relaxed text-gray-text">
                    {contract.notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3",
        accent ? "border-emerald-200 bg-emerald-50/60" : "border-gray/25 bg-white",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-text">{hint}</p>}
    </div>
  );
}
