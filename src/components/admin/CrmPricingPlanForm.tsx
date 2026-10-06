"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Calculator, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import type { PricingPerk, PricingPlan, PricingPriceMode, PricingTaxMention } from "@/content/pricing";
import type { PublicPricingPlanRecord } from "@/lib/public-pricing";
import { PricingPlanCard } from "@/components/sections/PricingPlanCard";
import {
  CrmFormField,
  CrmIconSelect,
  CrmLineListEditor,
  CrmRepeaterCard,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";
import { CURRENCY_LABELS, SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { computePlanTtc, formatPlanAmount } from "@/lib/pricing-display";
import { cn } from "@/lib/utils";

export type PlanForm = {
  name: string;
  tagline: string;
  variant: "primary" | "accent";
  highlighted: boolean;
  badgeLabel: string;
  locale: "fr" | "en";
  isVisible: boolean;
  priceMode: PricingPriceMode;
  /** Chiffres uniquement — converti en entier à l'envoi. */
  priceAmount: string;
  currencyCode: string;
  currencyLabel: string;
  taxMention: PricingTaxMention;
  priceNote: string;
  /** Calcul automatique : TTC = (base HT + charges HT) × (1 + TVA globale). */
  autoCalc: boolean;
  baseAmountHt: string;
  charges: { id: string; label: string; amount: string }[];
  perks: PricingPerk[];
  features: string[];
  ctaLabel: string;
  ctaHref: string;
};

const PRICE_MODE_LABELS: Record<PricingPriceMode, string> = {
  fixed: "Prix fixe",
  from: "À partir de",
  quote: "Sur devis",
};

const TAX_LABELS: Record<PricingTaxMention, string> = { ttc: "TTC", ht: "HT", none: "Aucune" };

const defaultCta = (locale: "fr" | "en") =>
  locale === "en" ? { ctaLabel: "Get a quote", ctaHref: "/en/devis" } : { ctaLabel: "Demander un devis", ctaHref: "/devis" };

export const emptyPlanForm = (locale: "fr" | "en" = "fr"): PlanForm => ({
  name: "",
  tagline: "",
  variant: "primary",
  highlighted: false,
  badgeLabel: "",
  locale,
  isVisible: true,
  priceMode: "quote",
  priceAmount: "",
  currencyCode: "XOF",
  currencyLabel: "FCFA",
  taxMention: "ttc",
  priceNote: "",
  autoCalc: false,
  baseAmountHt: "",
  charges: [],
  perks: [],
  features: [""],
  ...defaultCta(locale),
});

export function planToForm(r: PublicPricingPlanRecord): PlanForm {
  const locale = r.locale === "en" ? "en" : "fr";
  return {
    name: r.name,
    tagline: r.tagline,
    variant: r.variant,
    highlighted: r.highlighted,
    badgeLabel: r.badgeLabel ?? "",
    locale,
    isVisible: r.isVisible,
    priceMode: r.priceMode,
    priceAmount: r.priceAmount != null ? String(r.priceAmount) : "",
    currencyCode: r.currencyCode,
    currencyLabel: r.currencyLabel,
    taxMention: r.taxMention === "none" && r.priceMode === "quote" ? "ttc" : r.taxMention,
    priceNote: r.priceNote ?? "",
    autoCalc: r.baseAmountHt != null,
    baseAmountHt: r.baseAmountHt != null ? String(r.baseAmountHt) : "",
    charges: r.charges.map((c) => ({ ...c, amount: String(c.amount) })),
    perks: r.perks,
    features: r.features.length ? r.features : [""],
    ctaLabel: r.ctaLabel || defaultCta(locale).ctaLabel,
    ctaHref: r.ctaHref || defaultCta(locale).ctaHref,
  };
}

function cleanPerks(perks: PricingPerk[]): PricingPerk[] {
  return perks
    .map((p) => ({ ...p, title: p.title.trim(), detail: p.detail.trim() }))
    .filter((p) => p.title);
}

const digits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

function cleanCharges(form: PlanForm) {
  return form.charges
    .map((c) => ({ id: c.id, label: c.label.trim(), amount: Number(c.amount || 0) }))
    .filter((c) => c.label);
}

/** Détail HT → TTC si le calcul automatique est actif, sinon null. */
export function formBreakdown(form: PlanForm, vatRate: number) {
  if (!form.autoCalc || form.priceMode === "quote" || form.baseAmountHt === "") return null;
  return computePlanTtc(Number(form.baseAmountHt), cleanCharges(form), vatRate);
}

export function planFormToPayload(form: PlanForm) {
  const quote = form.priceMode === "quote";
  const auto = form.autoCalc && !quote;
  return {
    name: form.name.trim(),
    tagline: form.tagline.trim(),
    variant: form.variant,
    highlighted: form.highlighted,
    badgeLabel: form.highlighted ? form.badgeLabel.trim() : "",
    locale: form.locale,
    isVisible: form.isVisible,
    priceMode: form.priceMode,
    priceAmount: quote || form.priceAmount === "" ? null : Number(form.priceAmount),
    currencyCode: form.currencyCode,
    currencyLabel: form.currencyLabel.trim(),
    taxMention: form.taxMention,
    priceNote: form.priceNote.trim(),
    baseAmountHt: auto && form.baseAmountHt !== "" ? Number(form.baseAmountHt) : null,
    charges: cleanCharges(form),
    perks: cleanPerks(form.perks),
    features: form.features.map((f) => f.trim()).filter(Boolean),
    ctaLabel: form.ctaLabel.trim(),
    ctaHref: form.ctaHref.trim(),
  };
}

function formToPreviewPlan(form: PlanForm, vatRate: number): PricingPlan {
  const payload = planFormToPayload(form);
  const breakdown = formBreakdown(form, vatRate);
  return {
    ...payload,
    ...(breakdown ? { priceAmount: breakdown.totalTtc, taxMention: "ttc" as const } : {}),
    id: "preview",
    name: payload.name || "Nom de la formule",
    tagline: payload.tagline || "Description courte",
    priceAmount: breakdown ? breakdown.totalTtc : (payload.priceAmount ?? undefined),
    priceNote: payload.priceNote || undefined,
    features: payload.features.length ? payload.features : ["Prestation"],
    badgeLabel: payload.badgeLabel || undefined,
  };
}

function newPerkId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `perk-${Date.now().toString(36)}`;
}

function validate(form: PlanForm): string | null {
  if (form.priceMode !== "quote" && form.autoCalc) {
    if (form.baseAmountHt === "") return "Indiquez le prix de base HT.";
    if (form.charges.some((c) => !c.label.trim() && c.amount !== "")) return "Chaque charge doit avoir un libellé.";
  } else if (form.priceMode !== "quote" && !(Number(form.priceAmount) > 0)) {
    return "Indiquez un montant pour un prix fixe ou « À partir de ».";
  }
  if (!form.features.some((f) => f.trim())) return "Ajoutez au moins une prestation.";
  if (form.highlighted && !form.badgeLabel.trim()) return "Renseignez le texte du badge de mise en avant.";
  return null;
}

type Props = {
  creating: boolean;
  /** Taux de TVA global (%) réglé en haut de la page Tarifs. */
  vatRate: number;
  initial: PlanForm;
  saving: boolean;
  serverError: string;
  onCancel: () => void;
  onSubmit: (payload: ReturnType<typeof planFormToPayload>) => void;
};

export function CrmPricingPlanForm({ creating, vatRate, initial, saving, serverError, onCancel, onSubmit }: Props) {
  const [form, setForm] = useState<PlanForm>(initial);
  const [localError, setLocalError] = useState("");
  const set = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => setForm((p) => ({ ...p, [key]: value }));
  const isQuote = form.priceMode === "quote";
  const breakdown = formBreakdown(form, vatRate);
  const error = localError || serverError;

  function updatePerk(index: number, patch: Partial<PricingPerk>) {
    setForm((p) => ({ ...p, perks: p.perks.map((perk, i) => (i === index ? { ...perk, ...patch } : perk)) }));
  }

  function updateCharge(index: number, patch: Partial<PlanForm["charges"][number]>) {
    setForm((p) => ({ ...p, charges: p.charges.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));
  }

  function movePerk(index: number, delta: -1 | 1) {
    setForm((p) => {
      const target = index + delta;
      if (target < 0 || target >= p.perks.length) return p;
      const perks = [...p.perks];
      [perks[index], perks[target]] = [perks[target]!, perks[index]!];
      return { ...p, perks };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate(form);
    setLocalError(problem ?? "");
    if (!problem) onSubmit(planFormToPayload(form));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
      <div
        className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-plan-form-title"
      >
        <h2 id="pricing-plan-form-title" className="text-lg font-bold">
          {creating ? "Nouvelle formule" : "Modifier la formule"}
        </h2>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form id="pricing-plan-form" onSubmit={handleSubmit} className="min-w-0 space-y-6">
            <fieldset className="space-y-4">
              <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text">
                Informations générales
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Nom de la formule">
                  <input required minLength={2} maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} className={crmFieldClass} />
                </CrmFormField>
                <CrmFormField label="Description courte">
                  <input required minLength={2} maxLength={120} value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={crmFieldClass} placeholder="Pour démarrer." />
                </CrmFormField>
                <CrmFormField label="Variante visuelle">
                  <select value={form.variant} onChange={(e) => set("variant", e.target.value as PlanForm["variant"])} className={crmFieldClass}>
                    <option value="primary">Primary (bleu)</option>
                    <option value="accent">Accent (rouge)</option>
                  </select>
                </CrmFormField>
                <CrmFormField label="Langue">
                  <select value={form.locale} onChange={(e) => set("locale", e.target.value as PlanForm["locale"])} className={crmFieldClass}>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </CrmFormField>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.highlighted} onChange={(e) => set("highlighted", e.target.checked)} className="rounded border-gray/60 text-primary" />
                  Mise en avant
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.isVisible} onChange={(e) => set("isVisible", e.target.checked)} className="rounded border-gray/60 text-primary" />
                  Visible sur le site
                </label>
              </div>
              {form.highlighted && (
                <CrmFormField label="Texte du badge" hint="Affiché au-dessus de la carte, ex. « Populaire ».">
                  <input maxLength={40} value={form.badgeLabel} onChange={(e) => set("badgeLabel", e.target.value)} className={crmFieldClass} placeholder={form.locale === "en" ? "Popular" : "Populaire"} />
                </CrmFormField>
              )}
              <p className="text-xs text-gray-text">L’ordre des cartes se règle avec les boutons Haut / Bas de la liste.</p>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text">Prix</legend>
              <CrmFormField label="Mode d’affichage">
                <select value={form.priceMode} onChange={(e) => set("priceMode", e.target.value as PricingPriceMode)} className={crmFieldClass}>
                  {(Object.keys(PRICE_MODE_LABELS) as PricingPriceMode[]).map((mode) => (
                    <option key={mode} value={mode}>{PRICE_MODE_LABELS[mode]}</option>
                  ))}
                </select>
              </CrmFormField>
              {!isQuote && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.autoCalc} onChange={(e) => set("autoCalc", e.target.checked)} className="rounded border-gray/60 text-primary" />
                  Calcul automatique du TTC (prix de base HT + charges + TVA {vatRate.toLocaleString("fr-FR")} %)
                </label>
              )}
              {!isQuote && form.autoCalc && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary-light/40 p-4">
                  <CrmFormField label="Prix de base HT" hint="Chiffres uniquement, sans espace ni devise.">
                    <input
                      required
                      inputMode="numeric"
                      value={form.baseAmountHt}
                      onChange={(e) => set("baseAmountHt", digits(e.target.value))}
                      className={crmFieldClass}
                      placeholder="200000"
                    />
                  </CrmFormField>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Charges HT</p>
                    {form.charges.map((charge, index) => (
                      <div key={charge.id} className="flex gap-2">
                        <input
                          value={charge.label}
                          onChange={(e) => updateCharge(index, { label: e.target.value })}
                          maxLength={120}
                          className={crmFieldClass}
                          placeholder="Ex. Hébergement 1 an"
                          aria-label={`Libellé de la charge ${index + 1}`}
                        />
                        <input
                          inputMode="numeric"
                          value={charge.amount}
                          onChange={(e) => updateCharge(index, { amount: digits(e.target.value) })}
                          className={cn(crmFieldClass, "w-36 shrink-0")}
                          placeholder="Montant HT"
                          aria-label={`Montant HT de la charge ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => set("charges", form.charges.filter((_, i) => i !== index))}
                          className="shrink-0 rounded-xl border border-gray/60 bg-white p-2.5 text-gray-text hover:bg-red-50 hover:text-red-600"
                          aria-label={`Supprimer la charge ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                    {form.charges.length < 20 && (
                      <button
                        type="button"
                        onClick={() => set("charges", [...form.charges, { id: newPerkId(), label: "", amount: "" }])}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray/60 bg-white px-3 py-2 text-sm font-medium text-gray-text hover:border-primary/40 hover:text-primary"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Ajouter une charge
                      </button>
                    )}
                  </div>
                  {breakdown && (
                    <dl className="space-y-1 rounded-lg bg-white p-3 text-sm" aria-label="Détail du calcul">
                      <div className="flex justify-between gap-4"><dt className="text-gray-text">Prix de base HT</dt><dd>{formatPlanAmount(breakdown.baseHt)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-text">Charges HT</dt><dd>{formatPlanAmount(breakdown.chargesHt)}</dd></div>
                      <div className="flex justify-between gap-4 border-t border-gray/40 pt-1"><dt className="text-gray-text">Sous-total HT</dt><dd>{formatPlanAmount(breakdown.subtotalHt)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-text">TVA {breakdown.vatRate.toLocaleString("fr-FR")} %</dt><dd>{formatPlanAmount(breakdown.vatAmount)}</dd></div>
                      <div className="flex justify-between gap-4 border-t border-gray/40 pt-1 font-semibold">
                        <dt className="inline-flex items-center gap-1.5"><Calculator className="h-4 w-4 text-primary" aria-hidden />Total TTC affiché</dt>
                        <dd>{formatPlanAmount(breakdown.totalTtc)} {form.currencyLabel || form.currencyCode}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              )}
              {!isQuote && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {!form.autoCalc && (
                    <CrmFormField
                      label="Montant"
                      hint={form.priceAmount ? `Affiché : ${formatPlanAmount(Number(form.priceAmount))}` : "Chiffres uniquement, sans espace ni devise."}
                    >
                      <input
                        required
                        inputMode="numeric"
                        value={form.priceAmount}
                        onChange={(e) => set("priceAmount", digits(e.target.value))}
                        className={crmFieldClass}
                        placeholder="287000"
                      />
                    </CrmFormField>
                  )}
                  <CrmFormField label="Mention fiscale" hint={form.autoCalc ? "TTC imposé par le calcul automatique." : undefined}>
                    <select
                      value={form.autoCalc ? "ttc" : form.taxMention}
                      disabled={form.autoCalc}
                      onChange={(e) => set("taxMention", e.target.value as PricingTaxMention)}
                      className={cn(crmFieldClass, "disabled:opacity-60")}
                    >
                      {(Object.keys(TAX_LABELS) as PricingTaxMention[]).map((t) => (
                        <option key={t} value={t}>{TAX_LABELS[t]}</option>
                      ))}
                    </select>
                  </CrmFormField>
                  <CrmFormField label="Devise">
                    <select value={form.currencyCode} onChange={(e) => set("currencyCode", e.target.value)} className={crmFieldClass}>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
                      ))}
                    </select>
                  </CrmFormField>
                  <CrmFormField label="Libellé public de la devise">
                    <input maxLength={20} value={form.currencyLabel} onChange={(e) => set("currencyLabel", e.target.value)} className={crmFieldClass} placeholder="FCFA" />
                  </CrmFormField>
                </div>
              )}
              <CrmFormField
                label={isQuote ? "Libellé « sur devis » (facultatif)" : "Texte complémentaire (facultatif)"}
                hint={isQuote ? "Aucun montant ni mention fiscale n’est affiché dans ce mode." : undefined}
              >
                <input maxLength={120} value={form.priceNote} onChange={(e) => set("priceNote", e.target.value)} className={crmFieldClass} placeholder={isQuote ? (form.locale === "en" ? "Free custom quote" : "Devis personnalisé gratuit") : ""} />
              </CrmFormField>
            </fieldset>

            <fieldset className="space-y-3 border-t border-gray/30 pt-5">
              <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text">Services inclus</legend>
              {form.perks.map((perk, index) => (
                <CrmRepeaterCard
                  key={perk.id}
                  title="Avantage"
                  index={index}
                  onRemove={() => set("perks", form.perks.filter((_, i) => i !== index))}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <CrmFormField label="Titre">
                      <input maxLength={120} value={perk.title} onChange={(e) => updatePerk(index, { title: e.target.value })} className={crmFieldClass} />
                    </CrmFormField>
                    <CrmFormField label="Précision (petits caractères)">
                      <input maxLength={160} value={perk.detail} onChange={(e) => updatePerk(index, { detail: e.target.value })} className={crmFieldClass} />
                    </CrmFormField>
                    <CrmIconSelect value={perk.icon} onChange={(icon) => updatePerk(index, { icon })} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => updatePerk(index, { isVisible: !perk.isVisible })} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-light">
                      {perk.isVisible ? <><EyeOff className="h-3 w-3" aria-hidden />Masquer</> : <><Eye className="h-3 w-3" aria-hidden />Afficher</>}
                    </button>
                    <button type="button" onClick={() => movePerk(index, -1)} disabled={index === 0} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40">
                      <ArrowUp className="h-3 w-3" aria-hidden />Haut
                    </button>
                    <button type="button" onClick={() => movePerk(index, 1)} disabled={index === form.perks.length - 1} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 bg-white px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-40">
                      <ArrowDown className="h-3 w-3" aria-hidden />Bas
                    </button>
                    {!perk.isVisible && <span className="self-center text-xs text-gray-text">Masqué sur le site</span>}
                  </div>
                </CrmRepeaterCard>
              ))}
              {form.perks.length < 8 && (
                <button
                  type="button"
                  onClick={() => set("perks", [...form.perks, { id: newPerkId(), title: "", detail: "", icon: "Server", isVisible: true }])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray/60 px-3 py-2 text-sm font-medium text-gray-text hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Ajouter un avantage
                </button>
              )}
            </fieldset>

            <fieldset className="border-t border-gray/30 pt-5">
              <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text">Prestations</legend>
              <CrmLineListEditor
                values={form.features}
                onChange={(features) => set("features", features)}
                placeholder="Ex. Design responsive"
                addLabel="Ajouter une prestation"
                minItems={1}
                reorderable
              />
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text">Bouton</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Libellé">
                  <input required minLength={2} maxLength={60} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={crmFieldClass} />
                </CrmFormField>
                <CrmFormField label="Destination" hint="Chemin interne (/devis), ancre (#contact) ou URL https.">
                  <input required maxLength={300} value={form.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} className={crmFieldClass} />
                </CrmFormField>
              </div>
            </fieldset>
          </form>

          <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <p className="mb-5 text-xs font-semibold uppercase tracking-wide text-gray-text">Aperçu</p>
            <PricingPlanCard plan={formToPreviewPlan(form, vatRate)} locale={form.locale} className={cn(!form.isVisible && "opacity-60")} />
          </aside>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2 border-t border-gray/30 pt-4">
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light">
            Annuler
          </button>
          <button type="submit" form="pricing-plan-form" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
