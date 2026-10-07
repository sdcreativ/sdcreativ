"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeEuro,
  Calculator,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  PublicPricingPlanRecord,
  PublicPricingReassuranceRecord,
} from "@/lib/public-pricing";
import {
  createPricingPlanApi,
  createPricingReassuranceApi,
  deletePricingPlanApi,
  deletePricingReassuranceApi,
  fetchPricingPlansAdmin,
  fetchPricingReassuranceAdmin,
  fetchPricingSettingsApi,
  importStaticPricingApi,
  reorderPricingPlanApi,
  updatePricingPlanApi,
  updatePricingReassuranceApi,
  updatePricingSettingsApi,
  applyHostingCatalogApi,
  fetchHostingCatalogApi,
  syncHostingCatalogApi,
  type HostingCatalogResponse,
} from "@/lib/public-pricing-api";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmPricingPlanForm,
  emptyPlanForm,
  planToForm,
  type PlanForm,
  type planFormToPayload,
} from "@/components/admin/CrmPricingPlanForm";
import {
  computePlanPricing,
  DEFAULT_PRICING_HOSTING_EUR,
  DEFAULT_PRICING_REFERRAL_NOTE,
  DEFAULT_PRICING_DOMAIN_EUR,
  DEFAULT_PRICING_HOSTING_CHECKED_ON,
  DEFAULT_PRICING_REFERRAL_PERCENT,
  resolvePlanHosting,
  type HostingCatalogEntry,
  DEFAULT_PRICING_HOSTING_REFERRAL_EUR,
  DEFAULT_PRICING_HOSTING_RENEWAL_EUR,
  daysSinceHostingCheck,
  eurHtToXofTtc,
  PRICING_HOSTING_CHECK_MAX_DAYS,
  DEFAULT_PRICING_REFERRAL_URL,
  DEFAULT_PRICING_VAT_RATE,
  formatPlanAmount,
  formatReferralNote,
  hostingDiscountPercent,
  resolvePlanPriceDisplay,
} from "@/lib/pricing-display";
import type { PricingContext, PricingSettings } from "@/lib/public-pricing";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type ReassuranceForm = {
  label: string;
  description: string;
  locale: "fr" | "en";
  isVisible: boolean;
};

const emptyReassuranceForm = (): ReassuranceForm => ({
  label: "",
  description: "",
  locale: "fr",
  isVisible: true,
});

function reassuranceToForm(r: PublicPricingReassuranceRecord): ReassuranceForm {
  return {
    label: r.label,
    description: r.description,
    locale: r.locale as "fr" | "en",
    isVisible: r.isVisible,
  };
}

function formatAdminPrice(item: PublicPricingPlanRecord): string {
  const price = resolvePlanPriceDisplay(
    {
      ...item,
      priceAmount: item.priceAmount ?? undefined,
      priceNote: item.priceNote ?? undefined,
      compareAtAmount: item.compareAtAmount ?? undefined,
    },
    item.locale === "en" ? "en" : "fr",
  );
  if (price.kind === "quote") return `Sur devis — ${price.label}`;
  const final = [price.prefix, price.amount, price.suffix].filter(Boolean).join(" ");
  return (price.compareAt ? `${price.compareAt} → ${final}` : final) + (price.note ? ` · ${price.note}` : "");
}

function formatAdminBreakdown(item: PublicPricingPlanRecord, ctx: PricingContext): string {
  const resolved = resolvePlanHosting(item, ctx, ctx.catalog);
  const b = computePlanPricing({
    baseHt: item.baseAmountHt ?? 0,
    charges: item.charges,
    includeHosting: resolved != null,
    hostingEur: resolved?.normalEur ?? 0,
    hostingReferralEur: resolved?.paidEur ?? 0,
    vatRate: ctx.vatRate,
  });
  const pack = resolved ? ` (${resolved.packName ?? "prix manuels"} ${resolved.months} mois)` : "";
  const hosting = b.hostingHt > 0
    ? ` + hébergement${pack} ${formatPlanAmount(b.hostingHt)} − parrainage ${formatPlanAmount(b.discountHt)}`
    : "";
  return `Calcul auto : base ${formatPlanAmount(b.baseHt)} HT + ${item.charges.length} charge(s) ${formatPlanAmount(b.otherChargesHt)} HT${hosting} + TVA ${b.vatRate.toLocaleString("fr-FR")} % ${formatPlanAmount(b.vatAmount)}`;
}

const DEFAULT_SETTINGS: PricingSettings = {
  vatRate: DEFAULT_PRICING_VAT_RATE,
  referralUrl: DEFAULT_PRICING_REFERRAL_URL,
  hostingEur: DEFAULT_PRICING_HOSTING_EUR,
  hostingReferralEur: DEFAULT_PRICING_HOSTING_REFERRAL_EUR,
  hostingRenewalEur: DEFAULT_PRICING_HOSTING_RENEWAL_EUR,
  hostingCheckedOn: DEFAULT_PRICING_HOSTING_CHECKED_ON,
  referralNote: DEFAULT_PRICING_REFERRAL_NOTE,
  domainEur: DEFAULT_PRICING_DOMAIN_EUR,
  referralPercent: DEFAULT_PRICING_REFERRAL_PERCENT,
};

const euros = (centsValue: number) =>
  (centsValue / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Champs texte du formulaire de réglages (virgule décimale à la française). */
function settingsToInput(s: PricingSettings) {
  const dec = (n: number) => String(n).replace(".", ",");
  return {
    vatRate: dec(s.vatRate),
    referralUrl: s.referralUrl,
    hostingEur: dec(s.hostingEur),
    hostingReferralEur: dec(s.hostingReferralEur),
    hostingRenewalEur: dec(s.hostingRenewalEur),
    hostingCheckedOn: s.hostingCheckedOn,
    referralNote: s.referralNote,
    domainEur: dec(s.domainEur),
    referralPercent: dec(s.referralPercent),
  };
}

const decimalInput = (value: string, max = 9) => value.replace(/[^\d.,]/g, "").slice(0, max);

export function CrmPricingView() {
  const { confirm, alert } = useDialog();
  const [plans, setPlans] = useState<PublicPricingPlanRecord[]>([]);
  const [reassurance, setReassurance] = useState<PublicPricingReassuranceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localeFilter, setLocaleFilter] = useState<"fr" | "en" | "all">("fr");
  const [formMode, setFormMode] = useState<"plan" | "reassurance" | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingReassuranceId, setEditingReassuranceId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(() => emptyPlanForm());
  const [planFormKey, setPlanFormKey] = useState(0);
  const [focusPricing, setFocusPricing] = useState(false);
  const [planError, setPlanError] = useState("");
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [settingsInput, setSettingsInput] = useState(() => settingsToInput(DEFAULT_SETTINGS));
  const [savingSettings, setSavingSettings] = useState(false);
  const [catalog, setCatalog] = useState<HostingCatalogResponse>({ entries: [], syncedAt: null, apiConfigured: false });
  const [catalogBusy, setCatalogBusy] = useState<"sync" | "apply" | null>(null);
  const [reassuranceForm, setReassuranceForm] = useState<ReassuranceForm>(emptyReassuranceForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const locale = localeFilter === "all" ? undefined : localeFilter;
    try {
      const [plansData, reassuranceData, vat] = await Promise.all([
        fetchPricingPlansAdmin(locale),
        fetchPricingReassuranceAdmin(locale),
        fetchPricingSettingsApi(),
      ]);
      setSettings(vat);
      setSettingsInput(settingsToInput(vat));
      // Le catalogue est facultatif : son échec ne doit pas bloquer la page.
      fetchHostingCatalogApi().then(setCatalog).catch(() => undefined);
      setPlans(plansData);
      setReassurance(reassuranceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les tarifs.");
      setPlans([]);
      setReassurance([]);
    } finally {
      setLoading(false);
    }
  }, [localeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreatePlan() {
    setFocusPricing(false);
    setFormMode("plan");
    setCreating(true);
    setEditingPlanId(null);
    setPlanForm(emptyPlanForm(localeFilter === "en" ? "en" : "fr"));
    setPlanFormKey((k) => k + 1);
    setPlanError("");
    setMessage("");
  }

  function openEditPlan(item: PublicPricingPlanRecord, pricing = false) {
    setFocusPricing(pricing);
    setFormMode("plan");
    setCreating(false);
    setEditingPlanId(item.id);
    setPlanForm(planToForm(item));
    setPlanFormKey((k) => k + 1);
    setPlanError("");
    setMessage("");
  }

  function openCreateReassurance() {
    setFormMode("reassurance");
    setCreating(true);
    setEditingReassuranceId(null);
    setReassuranceForm(emptyReassuranceForm());
    setMessage("");
  }

  function openEditReassurance(item: PublicPricingReassuranceRecord) {
    setFormMode("reassurance");
    setCreating(false);
    setEditingReassuranceId(item.id);
    setReassuranceForm(reassuranceToForm(item));
    setMessage("");
  }

  function closeForm() {
    setFormMode(null);
    setCreating(false);
    setEditingPlanId(null);
    setEditingReassuranceId(null);
    setPlanForm(emptyPlanForm());
    setReassuranceForm(emptyReassuranceForm());
  }

  async function handlePlanSubmit(payload: ReturnType<typeof planFormToPayload>) {
    setSaving(true);
    setMessage("");
    setPlanError("");
    try {
      if (creating) {
        const item = await createPricingPlanApi(payload);
        setPlans((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Formule ajoutée.");
      } else if (editingPlanId) {
        const item = await updatePricingPlanApi(editingPlanId, payload);
        setPlans((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Formule mise à jour.");
      }
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReassuranceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      if (creating) {
        const item = await createPricingReassuranceApi(reassuranceForm);
        setReassurance((prev) => [...prev, item].sort((a, b) => a.sortOrder - b.sortOrder));
        closeForm();
        setMessage("Élément de réassurance ajouté.");
      } else if (editingReassuranceId) {
        const item = await updatePricingReassuranceApi(editingReassuranceId, reassuranceForm);
        setReassurance((prev) => prev.map((m) => (m.id === item.id ? item : m)));
        closeForm();
        setMessage("Élément de réassurance mis à jour.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlan(id: string, name: string) {
    const ok = await confirm({
      title: "Supprimer cette formule ?",
      message: `« ${name} » sera retirée du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deletePricingPlanApi(id);
      setPlans((prev) => prev.filter((m) => m.id !== id));
      if (editingPlanId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteReassurance(id: string, label: string) {
    const ok = await confirm({
      title: "Supprimer cet élément ?",
      message: `« ${label} » sera retiré du site.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setBusyId(id);
    try {
      await deletePricingReassuranceApi(id);
      setReassurance((prev) => prev.filter((m) => m.id !== id));
      if (editingReassuranceId === id) closeForm();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Suppression impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleTogglePlanVisible(item: PublicPricingPlanRecord) {
    setBusyId(item.id);
    try {
      const updated = await updatePricingPlanApi(item.id, { isVisible: !item.isVisible });
      setPlans((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleReassuranceVisible(item: PublicPricingReassuranceRecord) {
    setBusyId(item.id);
    try {
      const updated = await updatePricingReassuranceApi(item.id, { isVisible: !item.isVisible });
      setReassurance((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Mise à jour impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReorderPlan(id: string, direction: "up" | "down") {
    setBusyId(id);
    try {
      await reorderPricingPlanApi(id, direction);
      await load();
    } catch (err) {
      await alert({
        title: "Erreur",
        message: err instanceof Error ? err.message : "Réordonnancement impossible.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const settingsPercent = hostingDiscountPercent(
    Number(settingsInput.hostingEur.replace(",", ".")) || 0,
    Number(settingsInput.hostingReferralEur.replace(",", ".")) || 0,
  );

  const toInputNumber = (value: string) => Number(value.replace(",", ".")) || 0;
  const renewalPreview = eurHtToXofTtc(toInputNumber(settingsInput.hostingRenewalEur), toInputNumber(settingsInput.vatRate));
  const hostingCheckAge = daysSinceHostingCheck(settings.hostingCheckedOn);
  const pricingCtx: PricingContext = { ...settings, catalog: catalog.entries };
  const pendingEntries = catalog.entries.filter((e) => e.pending);
  const usedPacks = new Set(plans.filter((p) => p.includeHosting && p.hostingPackId).map((p) => p.hostingPackId));
  const referralPrice = (promoCents: number) =>
    Math.round((promoCents * (10000 - Math.round(settings.referralPercent * 100))) / 10000);

  async function handleCatalogSync() {
    setCatalogBusy("sync");
    try {
      const result = await syncHostingCatalogApi();
      setCatalog(await fetchHostingCatalogApi());
      setMessage(
        result.changes.length
          ? `Catalogue Hostinger synchronisé : ${result.changes.length} nouveau(x) prix en attente de validation.`
          : `Catalogue Hostinger synchronisé (${result.packs} packs) : aucun changement de prix.`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? `Impossible : ${err.message}` : "Impossible de synchroniser le catalogue.");
    } finally {
      setCatalogBusy(null);
    }
  }

  async function handleCatalogApply() {
    const ok = await confirm({
      title: "Appliquer les nouveaux prix Hostinger ?",
      message: "Les prix en attente remplacent les prix actuels ; les formules concernées sont recalculées et publiées.",
      confirmLabel: "Appliquer",
    });
    if (!ok) return;
    setCatalogBusy("apply");
    try {
      const result = await applyHostingCatalogApi();
      await load();
      setMessage(`${result.pricesApplied} prix Hostinger appliqué(s), ${result.plansUpdated} formule(s) recalculée(s).`);
    } catch (err) {
      setMessage(err instanceof Error ? `Impossible : ${err.message}` : "Impossible d'appliquer les prix.");
    } finally {
      setCatalogBusy(null);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    const toNumber = (v: string) => Math.round(Number(v.replace(",", ".")) * 100) / 100;
    const next: PricingSettings = {
      vatRate: toNumber(settingsInput.vatRate),
      referralUrl: settingsInput.referralUrl.trim(),
      hostingEur: toNumber(settingsInput.hostingEur),
      hostingReferralEur: toNumber(settingsInput.hostingReferralEur),
      hostingRenewalEur: toNumber(settingsInput.hostingRenewalEur),
      hostingCheckedOn: settingsInput.hostingCheckedOn,
      referralNote: settingsInput.referralNote.trim(),
      domainEur: toNumber(settingsInput.domainEur),
      referralPercent: toNumber(settingsInput.referralPercent),
    };
    if (![next.vatRate, next.referralPercent].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) {
      setMessage("Impossible : la TVA et la remise parrainage doivent être comprises entre 0 et 100 %.");
      return;
    }
    if (![next.hostingEur, next.hostingReferralEur, next.hostingRenewalEur, next.domainEur].every((v) => Number.isFinite(v) && v >= 0)) {
      setMessage("Impossible : prix d’hébergement invalide.");
      return;
    }
    if (next.hostingReferralEur > next.hostingEur) {
      setMessage("Impossible : le prix avec parrainage doit être inférieur ou égal au prix normal.");
      return;
    }
    const ok = await confirm({
      title: "Appliquer les réglages tarifs ?",
      message: `TVA ${next.vatRate.toLocaleString("fr-FR")} %. Le prix TTC et le prix barré des formules en calcul automatique seront recalculés et publiés sur le site.`,
      confirmLabel: "Appliquer",
    });
    if (!ok) return;
    setSavingSettings(true);
    try {
      const result = await updatePricingSettingsApi(next);
      await load();
      setMessage(
        result.plansUpdated > 0
          ? `Réglages enregistrés — ${result.plansUpdated} formule(s) recalculée(s).`
          : "Réglages enregistrés. Aucune formule n’utilise encore le calcul automatique : cliquez sur « Charges & TVA » sous une formule pour saisir son prix de base HT et ses charges.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? `Impossible : ${err.message}` : "Impossible d'enregistrer les réglages.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleImportStatic() {
    const ok = await confirm({
      title: "Importer les tarifs statiques ?",
      message:
        "Seules les formules et éléments absents de la base sont ajoutés. Les contenus déjà administrés ne sont jamais modifiés ni écrasés.",
      confirmLabel: "Importer",
    });
    if (!ok) return;

    setImporting(true);
    try {
      const result = await importStaticPricingApi();
      await load();
      setMessage(
        `Import : ${result.plansImported} formule(s), ${result.reassuranceImported} réassurance(s) ajoutée(s) — ` +
          `${result.plansSkipped + result.reassuranceSkipped} élément(s) déjà présent(s) conservé(s) tel(s) quel(s).`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setImporting(false);
    }
  }

  const showForm = formMode !== null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <BadgeEuro className="h-6 w-6 text-primary" aria-hidden />
            Tarifs
          </h1>
          <p className="mt-1 text-sm text-gray-text">
            Formules tarifaires et éléments de réassurance de la section tarifs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            Actualiser
          </button>
          <button type="button" onClick={() => void handleImportStatic()} disabled={importing} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Importer depuis le code
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["fr", "en", "all"] as const).map((loc) => (
          <button key={loc} type="button" onClick={() => setLocaleFilter(loc)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", localeFilter === loc ? "bg-primary text-white" : "bg-gray-light text-gray-text hover:bg-gray/20")}>
            {loc === "all" ? "Toutes langues" : loc.toUpperCase()}
          </button>
        ))}
      </div>

      {message && <p className={cn("text-sm", message.includes("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {hostingCheckAge != null && hostingCheckAge > PRICING_HOSTING_CHECK_MAX_DAYS && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          Les prix Hostinger ont été relevés il y a {hostingCheckAge} jours ({settings.hostingCheckedOn}). Hostinger change
          souvent ses promotions : vérifiez le panier avec le lien de parrainage, mettez à jour les prix ci-dessous et la date
          du relevé.
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-gray/60 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Catalogue Hostinger (API)</h2>
            <p className="mt-1 text-sm text-gray-text">
              {catalog.apiConfigured
                ? catalog.syncedAt
                  ? `Dernière synchronisation : ${new Date(catalog.syncedAt).toLocaleString("fr-FR")}. Relevé automatique chaque jour.`
                  : "Jamais synchronisé : lancez une première synchronisation."
                : "Jeton HOSTINGER_API_TOKEN absent : les prix manuels des réglages sont utilisés."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCatalogSync()}
              disabled={!catalog.apiConfigured || catalogBusy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", catalogBusy === "sync" && "animate-spin")} aria-hidden />
              Synchroniser maintenant
            </button>
            {pendingEntries.length > 0 && (
              <button
                type="button"
                onClick={() => void handleCatalogApply()}
                disabled={catalogBusy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {catalogBusy === "apply" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Appliquer les nouveaux prix ({pendingEntries.length})
              </button>
            )}
          </div>
        </div>
        {pendingEntries.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <p className="font-semibold">Hostinger a changé ses prix — non publiés tant que vous ne les appliquez pas :</p>
            <ul className="mt-1 list-inside list-disc">
              {pendingEntries.map((e) => (
                <li key={`${e.packId}-${e.months}`}>
                  {e.packName} {e.months} mois : promo {euros(e.promoCents)} € → <strong>{euros(e.pending!.promoCents)} €</strong>,
                  renouvellement {euros(e.renewalCents)} € → <strong>{euros(e.pending!.renewalCents)} €</strong>
                  {usedPacks.has(e.packId) && " (utilisé par une formule)"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {catalog.entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-text">
                <tr>
                  <th className="py-1.5 pr-3">Pack</th>
                  <th className="py-1.5 pr-3">Durée</th>
                  <th className="py-1.5 pr-3 text-right">Prix normal</th>
                  <th className="py-1.5 pr-3 text-right">Promo</th>
                  <th className="py-1.5 pr-3 text-right">Avec parrainage</th>
                  <th className="py-1.5 text-right">Renouvellement</th>
                </tr>
              </thead>
              <tbody>
                {catalog.entries
                  .filter((e: HostingCatalogEntry) => e.promoCents < e.renewalCents || usedPacks.has(e.packId))
                  .map((e: HostingCatalogEntry) => (
                    <tr key={`${e.packId}-${e.months}`} className={cn("border-t border-gray/30", usedPacks.has(e.packId) && "font-medium")}>
                      <td className="py-1.5 pr-3">
                        {e.packName}
                        {usedPacks.has(e.packId) && <span className="ml-1 text-xs text-primary">· utilisé</span>}
                      </td>
                      <td className="py-1.5 pr-3">{e.months} mois</td>
                      <td className="py-1.5 pr-3 text-right">{euros(e.listCents + Math.round(settings.domainEur * 100))} €</td>
                      <td className="py-1.5 pr-3 text-right">{euros(e.promoCents)} €</td>
                      <td className="py-1.5 pr-3 text-right">{euros(referralPrice(e.promoCents))} €</td>
                      <td className="py-1.5 text-right">{euros(e.renewalCents)} €</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-gray-text">
              Prix HT en euros. Prix normal = tarif mensuel × durée + domaine offert ({euros(Math.round(settings.domainEur * 100))} €).
              Parrainage −{settings.referralPercent.toLocaleString("fr-FR")} % sur la 1ʳᵉ commande ; pas de remise au renouvellement.
            </p>
          </div>
        )}
      </section>

      <form
        onSubmit={(e) => void handleSaveSettings(e)}
        className="space-y-4 rounded-2xl border border-gray/60 bg-white p-4 shadow-sm"
      >
        <div>
          <h2 className="text-base font-bold text-foreground">Réglages tarifs</h2>
          <p className="mt-1 text-sm text-gray-text">
            Communs à toutes les formules. Calcul automatique : TTC = (prix de base HT + charges HT + hébergement au tarif
            parrainage) × (1 + TVA).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-text">TVA (%)</span>
            <input
              inputMode="decimal"
              value={settingsInput.vatRate}
              onChange={(e) => setSettingsInput((p) => ({ ...p, vatRate: decimalInput(e.target.value, 6) }))}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-text">Lien de parrainage hébergeur</span>
            <input
              type="url"
              value={settingsInput.referralUrl}
              onChange={(e) => setSettingsInput((p) => ({ ...p, referralUrl: e.target.value }))}
              className={fieldClass}
              placeholder="https://www.hostinger.com/fr?REFERRALCODE=…"
            />
          </label>
        </div>

        <fieldset className="rounded-xl border border-gray/40 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-text">
            Hébergement — prix manuels 12 mois (utilisés si aucun pack du catalogue n’est choisi)
          </legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Prix normal (€ HT)</span>
              <input
                inputMode="decimal"
                value={settingsInput.hostingEur}
                onChange={(e) => setSettingsInput((p) => ({ ...p, hostingEur: decimalInput(e.target.value) }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Avec parrainage (€ HT)</span>
              <input
                inputMode="decimal"
                value={settingsInput.hostingReferralEur}
                onChange={(e) => setSettingsInput((p) => ({ ...p, hostingReferralEur: decimalInput(e.target.value) }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Renouvellement 2ᵉ année (€ HT/an)</span>
              <input
                inputMode="decimal"
                value={settingsInput.hostingRenewalEur}
                onChange={(e) => setSettingsInput((p) => ({ ...p, hostingRenewalEur: decimalInput(e.target.value) }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Prix relevés le</span>
              <input
                type="date"
                value={settingsInput.hostingCheckedOn}
                onChange={(e) => setSettingsInput((p) => ({ ...p, hostingCheckedOn: e.target.value }))}
                className={fieldClass}
              />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Domaine offert (€ HT, catalogue)</span>
              <input
                inputMode="decimal"
                value={settingsInput.domainEur}
                onChange={(e) => setSettingsInput((p) => ({ ...p, domainEur: decimalInput(e.target.value) }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-text">Remise parrainage (%, catalogue)</span>
              <input
                inputMode="decimal"
                value={settingsInput.referralPercent}
                onChange={(e) => setSettingsInput((p) => ({ ...p, referralPercent: decimalInput(e.target.value, 6) }))}
                className={fieldClass}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-text">
            Convertis à 655,957 FCFA pour 1 €. Remise calculée : −{settingsPercent.toLocaleString("fr-FR")} % sur
            l’hébergement des formules où « Inclure l’hébergement Hostinger » est coché. Renouvellement affiché sur le site :
            ≈ {formatPlanAmount(renewalPreview)} FCFA TTC/an.
          </p>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Mention sous l’avantage hébergement (quand la remise s’applique)
          </span>
          <input
            maxLength={160}
            value={settingsInput.referralNote}
            onChange={(e) => setSettingsInput((p) => ({ ...p, referralNote: e.target.value }))}
            className={fieldClass}
            placeholder={DEFAULT_PRICING_REFERRAL_NOTE}
          />
          <span className="mt-1 block text-xs text-gray-text">
            {"{pourcentage}"} est remplacé par la remise calculée. Aperçu : « {formatReferralNote(settingsInput.referralNote, settingsPercent)} »
          </span>
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={savingSettings || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {savingSettings && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Appliquer
          </button>
        </div>
      </form>

      {/* Section formules */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-foreground">Formules tarifaires</h2>
          <button type="button" onClick={openCreatePlan} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter une formule
          </button>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement…
          </p>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-8 text-center text-sm text-gray-text">
            Aucune formule en base — le site affiche les données statiques du code.
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((item, index) => (
              <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.name}
                      {item.highlighted && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Mise en avant{item.badgeLabel ? ` · ${item.badgeLabel}` : ""}</span>}
                      {!item.isVisible && <span className="ml-2 rounded-full bg-gray-light px-2 py-0.5 text-xs font-medium text-gray-text">Masquée</span>}
                    </h3>
                    <p className="mt-1 text-sm text-gray-text">{item.tagline}</p>
                    <p className="mt-1 text-sm font-medium">{formatAdminPrice(item)}</p>
                    {item.compareAtAmount != null && item.priceAmount != null && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Remise parrainage hébergement :{" "}
                        −{formatPlanAmount(item.compareAtAmount - item.priceAmount)} TTC · Prix barré (TTC sans remise) :{" "}
                        <span className="line-through">{formatPlanAmount(item.compareAtAmount)}</span>
                      </p>
                    )}
                    {item.priceMode !== "quote" && (
                      <p className="mt-1 text-xs text-gray-text">
                        {item.baseAmountHt != null
                          ? formatAdminBreakdown(item, pricingCtx)
                          : "Prix saisi manuellement — « Charges & TVA » pour le calculer à partir du HT et des charges."}
                      </p>
                    )}
                    {item.perks.length > 0 && (
                      <p className="mt-1 text-xs text-gray-text">
                        Services inclus : {item.perks.filter((p) => p.isVisible).map((p) => p.title).join(" · ") || "tous masqués"}
                      </p>
                    )}
                    <ul className="mt-2 list-inside list-disc text-xs text-gray-text">
                      {item.features.slice(0, 3).map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                      {item.features.length > 3 && <li>…</li>}
                    </ul>
                  </div>
                  <span className="rounded-lg bg-gray-light px-2 py-1 text-xs font-medium text-gray-text">{item.variant}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => openEditPlan(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                  <button type="button" onClick={() => openEditPlan(item, true)} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-2 py-1 text-xs font-medium text-primary hover:bg-primary-light"><Calculator className="h-3 w-3" aria-hidden />Charges &amp; TVA</button>
                  <button type="button" onClick={() => void handleTogglePlanVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                  <button type="button" onClick={() => void handleReorderPlan(item.id, "up")} disabled={busyId === item.id || index === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowUp className="h-3 w-3" aria-hidden />Haut</button>
                  <button type="button" onClick={() => void handleReorderPlan(item.id, "down")} disabled={busyId === item.id || index === plans.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40"><ArrowDown className="h-3 w-3" aria-hidden />Bas</button>
                  <button type="button" onClick={() => void handleDeletePlan(item.id, item.name)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Section réassurance */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            Réassurance
          </h2>
          <button type="button" onClick={openCreateReassurance} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-light">
            <Plus className="h-4 w-4" aria-hidden />
            Ajouter
          </button>
        </div>

        {loading ? null : reassurance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/60 bg-gray-light/30 px-6 py-8 text-center text-sm text-gray-text">
            Aucun élément de réassurance en base.
          </div>
        ) : (
          <div className="space-y-3">
            {reassurance.map((item) => (
              <article key={item.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", item.isVisible ? "border-gray/60" : "border-gray/40 opacity-70")}>
                <h3 className="font-semibold text-foreground">{item.label}</h3>
                <p className="mt-1 text-sm text-gray-text">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => openEditReassurance(item)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                  <button type="button" onClick={() => void handleToggleReassuranceVisible(item)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{item.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}</button>
                  <button type="button" onClick={() => void handleDeleteReassurance(item.id, item.label)} disabled={busyId === item.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && formMode === "plan" && (
        <CrmPricingPlanForm
          key={planFormKey}
          creating={creating}
          settings={pricingCtx}
          initial={planForm}
          focusPricing={focusPricing}
          saving={saving}
          serverError={planError}
          onCancel={closeForm}
          onSubmit={(payload) => void handlePlanSubmit(payload)}
        />
      )}

      {showForm && formMode === "reassurance" && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 className="text-lg font-bold">{creating ? "Nouvel élément" : "Modifier l'élément"}</h2>
            <form onSubmit={(e) => void handleReassuranceSubmit(e)} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Libellé</span>
                <input required value={reassuranceForm.label} onChange={(e) => setReassuranceForm((p) => ({ ...p, label: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Description</span>
                <textarea required rows={3} value={reassuranceForm.description} onChange={(e) => setReassuranceForm((p) => ({ ...p, description: e.target.value }))} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Langue</span>
                <select value={reassuranceForm.locale} onChange={(e) => setReassuranceForm((p) => ({ ...p, locale: e.target.value as "fr" | "en" }))} className={fieldClass}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reassuranceForm.isVisible} onChange={(e) => setReassuranceForm((p) => ({ ...p, isVisible: e.target.checked }))} className="rounded border-gray/60 text-primary" />
                Visible sur le site
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeForm} className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light">Annuler</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
