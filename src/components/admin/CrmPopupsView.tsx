"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, FlaskConical, Gift, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";
import { CrmFormField, CrmFormHeader, crmFieldClass } from "@/components/admin/crm-site-form-ui";
import { SitePopupCard } from "@/components/popups/SitePopupCard";
import { parseFetchJson } from "@/lib/fetch-json";
import type { PopupPerformance, PopupSignup } from "@/lib/site-popups";
import type { ClientBenefit } from "@/lib/client-benefits";
import { BENEFIT_STATUS_LABELS } from "@/lib/client-benefits-types";
import {
  DEFAULT_SITE_POPUP,
  POPUP_PROJECT_TYPES,
  POPUP_REMINDER_DAYS,
  type SitePopup,
  type SitePopupInput,
} from "@/lib/site-popups-types";
import { cn } from "@/lib/utils";

const api = {
  list: async () =>
    parseFetchJson<{ popups: SitePopup[]; performance: PopupPerformance[] }>(
      await fetch("/api/admin/site-popups", { credentials: "include" }),
    ),
  signups: async () =>
    (await parseFetchJson<{ signups: PopupSignup[] }>(await fetch("/api/admin/site-popups/signups", { credentials: "include" }))).signups,
  save: async (id: string | null, data: Partial<SitePopupInput>) =>
    (
      await parseFetchJson<{ popup: SitePopup }>(
        await fetch(id ? `/api/admin/site-popups/${id}` : "/api/admin/site-popups", {
          method: id ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      )
    ).popup,
  remove: async (id: string) =>
    parseFetchJson(await fetch(`/api/admin/site-popups/${id}`, { method: "DELETE", credentials: "include" })),
  benefits: async () =>
    (await parseFetchJson<{ benefits: ClientBenefit[] }>(await fetch("/api/admin/client-benefits", { credentials: "include" }))).benefits,
  cancelBenefit: async (id: string) =>
    parseFetchJson(await fetch(`/api/admin/client-benefits/${id}`, { method: "DELETE", credentials: "include" })),
};

const frDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR");

const rate = (signups: number, impressions: number) =>
  impressions > 0 ? `${((signups / impressions) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—";

const fcfa = (amount: number) => `${amount.toLocaleString("fr-FR")} FCFA`;

/** Groupes de test A/B (au moins 2 popups partageant la même clé). */
function abGroups(popups: SitePopup[]): Array<{ key: string; variants: SitePopup[] }> {
  const byKey = new Map<string, SitePopup[]>();
  for (const p of popups) {
    if (!p.abTestKey) continue;
    byKey.set(p.abTestKey, [...(byKey.get(p.abTestKey) ?? []), p]);
  }
  return [...byKey.entries()].filter(([, v]) => v.length > 1).map(([key, variants]) => ({ key, variants }));
}

/** Affichages minimum par version avant de désigner un gagnant. */
const AB_MIN_IMPRESSIONS = 100;

const toLines = (paths: string[]) => paths.join("\n");
const fromLines = (text: string) =>
  text
    .split(/\n|,/)
    .map((p) => p.trim())
    .filter(Boolean);

type FormState = SitePopupInput & { includeText: string; excludeText: string };

const toForm = (p: SitePopupInput): FormState => ({ ...p, includeText: toLines(p.includePaths), excludeText: toLines(p.excludePaths) });

function formToPayload(f: FormState): SitePopupInput {
  const { includeText, excludeText, ...rest } = f;
  return { ...rest, includePaths: fromLines(includeText), excludePaths: fromLines(excludeText) };
}

function PopupForm({
  initial,
  creating,
  saving,
  error,
  onCancel,
  onSubmit,
}: {
  initial: FormState;
  creating: boolean;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (data: SitePopupInput) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));
  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v)) || 0));
  const legend = "mb-2 text-sm font-semibold uppercase tracking-wide text-gray-text";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="popup-form-title">
        <h2 id="popup-form-title" className="text-lg font-bold">{creating ? "Nouveau popup" : "Modifier le popup"}</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <form id="popup-form" className="min-w-0 space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit(formToPayload(form)); }}>
            <fieldset className="space-y-4">
              <legend className={legend}>Contenu</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Nom interne"><input required minLength={2} maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Sur-titre (facultatif)"><input maxLength={80} value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} className={crmFieldClass} /></CrmFormField>
              </div>
              <CrmFormField label="Titre"><input required minLength={2} maxLength={140} value={form.title} onChange={(e) => set("title", e.target.value)} className={crmFieldClass} /></CrmFormField>
              <CrmFormField label="Texte"><textarea rows={3} maxLength={600} value={form.body} onChange={(e) => set("body", e.target.value)} className={crmFieldClass} /></CrmFormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <CrmFormField label="Langue">
                  <select value={form.locale} onChange={(e) => set("locale", e.target.value as FormState["locale"])} className={crmFieldClass}><option value="fr">Français</option><option value="en">English</option></select>
                </CrmFormField>
                <CrmFormField label="Format (ordinateur)">
                  <select value={form.layout} onChange={(e) => set("layout", e.target.value as FormState["layout"])} className={crmFieldClass}><option value="modal">Fenêtre centrée</option><option value="slide">Encart en bas à gauche</option></select>
                </CrmFormField>
                <CrmFormField label="Couleur">
                  <select value={form.variant} onChange={(e) => set("variant", e.target.value as FormState["variant"])} className={crmFieldClass}><option value="primary">Bleu</option><option value="accent">Rouge</option></select>
                </CrmFormField>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className={legend}>Offre et code personnel</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Avantage offert" hint="Affiché dans la pastille et dans l'e-mail."><input required minLength={2} maxLength={120} value={form.offerLabel} onChange={(e) => set("offerLabel", e.target.value)} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Bouton d'envoi"><input required minLength={2} maxLength={60} value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Préfixe du code" hint="Ex. SDC → SDC-AWA-7K2Q"><input required value={form.codePrefix} onChange={(e) => set("codePrefix", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Validité du code (jours)"><input type="number" min={1} max={365} value={form.codeValidDays} onChange={(e) => set("codeValidDays", Math.max(1, Number(e.target.value) || 1))} className={crmFieldClass} /></CrmFormField>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary-light/40 p-4">
                <p className="text-sm font-semibold text-foreground">Avantage appliqué automatiquement</p>
                <p className="mt-1 text-xs text-gray-text">
                  Ce que le code donne réellement : il est figé à l’inscription, enregistré à la signature du devis, puis appliqué
                  tout seul aux factures de maintenance (brouillons). Rappels au client et à vous 30 jours avant.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <CrmFormField label="Type">
                    <select value={form.benefitKind} onChange={(e) => set("benefitKind", e.target.value as FormState["benefitKind"])} className={crmFieldClass}>
                      <option value="none">Aucun (offre manuelle)</option>
                      <option value="maintenance_discount">Remise sur la maintenance</option>
                    </select>
                  </CrmFormField>
                  {form.benefitKind === "maintenance_discount" && (
                    <>
                      <CrmFormField label="Remise (%)"><input required type="number" min={1} max={100} value={form.benefitPercent ?? ""} onChange={(e) => set("benefitPercent", num(e.target.value))} className={crmFieldClass} /></CrmFormField>
                      <CrmFormField label="Début (mois après signature)"><input required type="number" min={0} max={120} value={form.benefitStartMonths ?? ""} onChange={(e) => set("benefitStartMonths", num(e.target.value))} className={crmFieldClass} /></CrmFormField>
                      <CrmFormField label="Durée (mois)"><input required type="number" min={1} max={120} value={form.benefitDurationMonths ?? ""} onChange={(e) => set("benefitDurationMonths", num(e.target.value))} className={crmFieldClass} /></CrmFormField>
                    </>
                  )}
                </div>
                {form.benefitKind === "maintenance_discount" && form.benefitPercent != null && form.benefitStartMonths != null && form.benefitDurationMonths != null && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    → -{form.benefitPercent} % sur la maintenance, du {form.benefitStartMonths}ᵉ au {form.benefitStartMonths + form.benefitDurationMonths}ᵉ mois
                    après la signature du devis. Vérifiez que le texte du popup dit la même chose.
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Titre après inscription"><input required minLength={2} maxLength={140} value={form.successTitle} onChange={(e) => set("successTitle", e.target.value)} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Texte après inscription"><input maxLength={600} value={form.successBody} onChange={(e) => set("successBody", e.target.value)} className={crmFieldClass} /></CrmFormField>
              </div>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className={legend}>Formulaire</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.askPhone} onChange={(e) => set("askPhone", e.target.checked)} className="rounded border-gray/60 text-primary" />Demander le WhatsApp (facultatif pour le visiteur)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.askProject} onChange={(e) => set("askProject", e.target.checked)} className="rounded border-gray/60 text-primary" />Demander le type de projet</label>
              </div>
              <CrmFormField label="Texte de consentement" hint="Obligatoire (loi ivoirienne 2013-450, RGPD) : le visiteur doit cocher la case."><textarea required rows={2} minLength={10} maxLength={400} value={form.consentText} onChange={(e) => set("consentText", e.target.value)} className={crmFieldClass} /></CrmFormField>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className={legend}>Déclenchement et fréquence</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <CrmFormField label="Après (secondes)" hint="Vide = désactivé"><input type="number" min={0} max={600} value={form.triggerDelaySeconds ?? ""} onChange={(e) => set("triggerDelaySeconds", num(e.target.value))} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Après défilement (%)" hint="Vide = désactivé"><input type="number" min={5} max={100} value={form.triggerScrollPercent ?? ""} onChange={(e) => set("triggerScrollPercent", num(e.target.value))} className={crmFieldClass} /></CrmFormField>
                <CrmFormField label="Au plus 1 fois tous les (jours)"><input type="number" min={0} max={365} value={form.frequencyDays} onChange={(e) => set("frequencyDays", Math.max(0, Number(e.target.value) || 0))} className={crmFieldClass} /></CrmFormField>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.triggerExitIntent} onChange={(e) => set("triggerExitIntent", e.target.checked)} className="rounded border-gray/60 text-primary" />Intention de sortie (ordinateur)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.showOnMobile} onChange={(e) => set("showOnMobile", e.target.checked)} className="rounded border-gray/60 text-primary" />Afficher sur mobile (panneau bas de page)</label>
              </div>
              <p className="text-xs text-gray-text">Le popup s’affiche au premier déclencheur atteint, jamais avant le choix des cookies, et plus jamais après une inscription.</p>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className={legend}>Relances et test A/B</legend>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={form.remindersEnabled} onChange={(e) => set("remindersEnabled", e.target.checked)} className="mt-0.5 rounded border-gray/60 text-primary" />
                <span>
                  Relancer par e-mail à J+{POPUP_REMINDER_DAYS[0]} puis J+{POPUP_REMINDER_DAYS[1]} si le code n’a pas servi
                  <span className="block text-xs text-gray-text">Arrêt automatique dès qu’un devis est demandé, si le code expire ou si la personne se désinscrit (lien dans chaque e-mail).</span>
                </span>
              </label>
              <CrmFormField
                label="Clé de test A/B (facultatif)"
                hint="Donnez la même clé à 2 popups actifs de même langue sur les mêmes pages (ex. maintenance-vs-hebergement) : les visiteurs sont répartis à parts égales, chacun voit toujours la même version."
              >
                <input value={form.abTestKey ?? ""} maxLength={40} onChange={(e) => set("abTestKey", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") || null)} className={crmFieldClass} placeholder="ex. maintenance-vs-hebergement" />
              </CrmFormField>
            </fieldset>

            <fieldset className="space-y-4 border-t border-gray/30 pt-5">
              <legend className={legend}>Ciblage</legend>
              <div className="grid gap-4 sm:grid-cols-3">
                <CrmFormField label="Visiteurs">
                  <select value={form.audience} onChange={(e) => set("audience", e.target.value as FormState["audience"])} className={crmFieldClass}><option value="all">Tous</option><option value="new">Nouveaux visiteurs</option><option value="returning">Visiteurs qui reviennent</option></select>
                </CrmFormField>
                <CrmFormField label="Uniquement sur (une par ligne)" hint="Vide = toutes les pages"><textarea rows={3} value={form.includeText} onChange={(e) => set("includeText", e.target.value)} className={crmFieldClass} placeholder="/tarifs" /></CrmFormField>
                <CrmFormField label="Jamais sur (une par ligne)"><textarea rows={3} value={form.excludeText} onChange={(e) => set("excludeText", e.target.value)} className={crmFieldClass} /></CrmFormField>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded border-gray/60 text-primary" />Actif sur le site</label>
            </fieldset>
          </form>

          <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-text">Aperçu</p>
            <div className="rounded-2xl bg-black/40 p-4">
              <SitePopupCard popup={form} onClose={() => undefined}>
                <div className="space-y-3" aria-hidden>
                  <div className={cn(crmFieldClass, "text-gray-text")}>Prénom</div>
                  <div className={cn(crmFieldClass, "text-gray-text")}>E-mail</div>
                  {form.askProject && (
                    <div className="flex flex-wrap gap-1.5">
                      {POPUP_PROJECT_TYPES.slice(0, 3).map((t) => <span key={t} className="rounded-full border border-gray/60 px-2.5 py-1 text-xs">{t}</span>)}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed text-gray-text">☐ {form.consentText}</p>
                  <div className={cn("rounded-lg py-2.5 text-center text-sm font-semibold text-white", form.variant === "accent" ? "bg-accent" : "bg-primary")}>{form.ctaLabel}</div>
                </div>
              </SitePopupCard>
            </div>
          </aside>
        </div>
        {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="mt-4 flex justify-end gap-2 border-t border-gray/30 pt-4">
          <button type="button" onClick={onCancel} className="rounded-xl border border-gray/60 px-4 py-2 text-sm font-medium hover:bg-gray-light">Annuler</button>
          <button type="submit" form="popup-form" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export function CrmPopupsView() {
  const { confirm } = useDialog();
  const [popups, setPopups] = useState<SitePopup[]>([]);
  const [performance, setPerformance] = useState<Map<string, PopupPerformance>>(new Map());
  const [signups, setSignups] = useState<PopupSignup[] | null>(null);
  const [benefits, setBenefits] = useState<ClientBenefit[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: FormState; key: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Horodatage du dernier chargement : référence pour savoir si un code a expiré. */
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.list();
      setPopups(data.popups);
      setPerformance(new Map((data.performance ?? []).map((p) => [p.popupId, p])));
      setSignups(await api.signups().catch(() => null));
      setBenefits(await api.benefits().catch(() => null));
      setLoadedAt(Date.now());
    } catch (err) {
      setMessage(err instanceof Error ? `Impossible : ${err.message}` : "Impossible de charger les popups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(data: SitePopupInput) {
    if (!editing) return;
    setSaving(true);
    setFormError("");
    try {
      await api.save(editing.id, data);
      setEditing(null);
      setMessage(editing.id ? "Popup mis à jour." : "Popup créé.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(p: SitePopup) {
    setBusyId(p.id);
    try {
      await api.save(p.id, { isActive: !p.isActive });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: SitePopup) {
    const ok = await confirm({ title: "Supprimer ce popup ?", message: `« ${p.name} » et ses statistiques seront supprimés (les inscrits sont conservés).`, confirmLabel: "Supprimer", variant: "danger" });
    if (!ok) return;
    setBusyId(p.id);
    try {
      await api.remove(p.id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function cancelBenefit(b: ClientBenefit) {
    const ok = await confirm({
      title: "Annuler cet avantage ?",
      message: `La remise « ${b.label} » ne sera plus appliquée aux factures de ${b.clientName || b.email}. À réserver aux devis annulés.`,
      confirmLabel: "Annuler l'avantage",
      variant: "danger",
    });
    if (!ok) return;
    await api.cancelBenefit(b.id);
    await load();
  }

  const open = (p: SitePopup | null) => {
    setFormError("");
    setEditing({ id: p?.id ?? null, form: toForm(p ?? DEFAULT_SITE_POPUP), key: Date.now() });
  };

  return (
    <div className="space-y-8">
      <CrmFormHeader
        icon={Gift}
        title="Popups"
        description="Popups de capture façon Mailchimp : offre exclusive avec code personnel, déclencheurs, ciblage et statistiques. Les inscrits arrivent dans les leads (source « Popup »)."
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-light disabled:opacity-60">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />Actualiser
            </button>
            <button type="button" onClick={() => open(null)} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              <Plus className="h-4 w-4" aria-hidden />Nouveau popup
            </button>
          </div>
        }
      />

      {message && <p className={cn("text-sm", message.startsWith("Impossible") ? "text-red-600" : "text-emerald-700")} role="status">{message}</p>}

      <section className="space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-gray-text"><Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />Chargement…</p>
        ) : popups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray/60 px-6 py-8 text-center text-sm text-gray-text">Aucun popup. Créez-en un avec « Nouveau popup ».</div>
        ) : (
          popups.map((p) => (
            <article key={p.id} className={cn("rounded-2xl border bg-white p-4 shadow-sm", p.isActive ? "border-gray/60" : "border-gray/40 opacity-80")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {p.name}
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-medium", p.isActive ? "bg-emerald-50 text-emerald-800" : "bg-gray-light text-gray-text")}>{p.isActive ? "Actif" : "Inactif"}</span>
                    <span className="ml-1 rounded-full bg-gray-light px-2 py-0.5 text-xs font-medium text-gray-text">{p.locale.toUpperCase()}</span>
                    {p.abTestKey && <span className="ml-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">Test A/B : {p.abTestKey}</span>}
                  </h3>
                  <p className="mt-1 text-sm text-gray-text">{p.title}</p>
                  <p className="mt-1 text-xs text-gray-text">Avantage : {p.offerLabel} · code {p.codePrefix}-…, {p.codeValidDays} j</p>
                </div>
                <dl className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div><dt className="text-xs text-gray-text">Affichages</dt><dd className="font-semibold">{p.impressions}</dd></div>
                  <div><dt className="text-xs text-gray-text">Fermetures</dt><dd className="font-semibold">{p.closes}</dd></div>
                  <div><dt className="text-xs text-gray-text">Inscriptions</dt><dd className="font-semibold">{p.signups}</dd></div>
                  <div><dt className="text-xs text-gray-text">Conversion</dt><dd className="font-semibold text-primary">{rate(p.signups, p.impressions)}</dd></div>
                </dl>
              </div>
              {(() => {
                const perf = performance.get(p.id);
                return (
                  <p className="mt-3 rounded-xl bg-gray-light/50 px-3 py-2 text-xs text-gray-text">
                    Du popup au devis : <strong className="text-foreground">{perf?.codesUsed ?? 0}</strong> code(s) utilisé(s) ·{" "}
                    <strong className="text-foreground">{perf?.quotes ?? 0}</strong> devis ·{" "}
                    <strong className="text-emerald-800">{perf?.quotesSigned ?? 0} signé(s)</strong>
                    {perf && perf.signedAmountXof > 0 ? ` (${fcfa(perf.signedAmountXof)} HT)` : ""} ·{" "}
                    {p.remindersEnabled ? `${perf?.reminders ?? 0} relance(s) envoyée(s)` : "relances désactivées"}
                  </p>
                );
              })()}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => open(p)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                <button type="button" onClick={() => void toggle(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{p.isActive ? <><EyeOff className="h-3 w-3" aria-hidden />Désactiver</> : <><Eye className="h-3 w-3" aria-hidden />Activer</>}</button>
                <button type="button" onClick={() => void remove(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
              </div>
            </article>
          ))
        )}
      </section>

      {abGroups(popups).map((group) => {
        const rows = group.variants.map((v) => ({
          popup: v,
          rate: v.impressions > 0 ? v.signups / v.impressions : 0,
          perf: performance.get(v.id),
        }));
        const enough = rows.every((r) => r.popup.impressions >= AB_MIN_IMPRESSIONS);
        const best = enough ? rows.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
        return (
          <section key={group.key} className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <FlaskConical className="h-5 w-5 text-violet-700" aria-hidden />
              Test A/B « {group.key} »
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-gray/60 bg-white">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-text">
                  <tr className="border-b border-gray/40">
                    <th className="px-3 py-2">Version</th><th className="px-3 py-2">Offre</th><th className="px-3 py-2">Affichages</th><th className="px-3 py-2">Inscriptions</th><th className="px-3 py-2">Taux</th><th className="px-3 py-2">Devis signés</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.popup.id} className={cn("border-t border-gray/30", best?.popup.id === r.popup.id && "bg-emerald-50/60")}>
                      <td className="px-3 py-2 font-medium">
                        {r.popup.name}
                        {!r.popup.isActive && <span className="ml-1 text-xs text-gray-text">(inactif)</span>}
                        {best?.popup.id === r.popup.id && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">En tête</span>}
                      </td>
                      <td className="px-3 py-2">{r.popup.offerLabel}</td>
                      <td className="px-3 py-2">{r.popup.impressions}</td>
                      <td className="px-3 py-2">{r.popup.signups}</td>
                      <td className="px-3 py-2 font-semibold text-primary">{rate(r.popup.signups, r.popup.impressions)}</td>
                      <td className="px-3 py-2">{r.perf?.quotesSigned ?? 0}{r.perf && r.perf.signedAmountXof > 0 ? ` · ${fcfa(r.perf.signedAmountXof)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-text">
              {enough
                ? "Gagnant au taux d’inscription. Vérifiez aussi les devis signés avant de désactiver l’autre version."
                : `Pas encore assez de données : attendez au moins ${AB_MIN_IMPRESSIONS} affichages par version avant de conclure.`}
            </p>
          </section>
        );
      })}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Avantages promis</h2>
        <p className="text-sm text-gray-text">
          Créés à la signature d’un devis portant un code. Appliqués automatiquement aux factures de maintenance du client
          pendant la période ; rappel 30 jours avant, alerte si une période se termine sans application.
        </p>
        {benefits === null ? (
          <p className="text-sm text-gray-text">Liste réservée aux comptes ayant accès aux clients.</p>
        ) : benefits.length === 0 ? (
          <p className="text-sm text-gray-text">Aucun avantage promis pour l’instant.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray/60 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-text">
                <tr className="border-b border-gray/40">
                  <th className="px-3 py-2">Client</th><th className="px-3 py-2">Avantage</th><th className="px-3 py-2">Période</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Factures remisées</th><th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {benefits.map((b) => (
                  <tr key={b.id} className="border-t border-gray/30">
                    <td className="px-3 py-2">{b.clientName || b.email}<span className="block text-xs text-gray-text">{b.email}{b.clientId ? "" : " · fiche client à créer"}</span></td>
                    <td className="px-3 py-2">-{b.percent.toLocaleString("fr-FR")} % maintenance<span className="block font-mono text-xs text-gray-text">{b.promoCode}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{frDate(b.startsOn)} → {frDate(b.endsOn)}</td>
                    <td className={cn("px-3 py-2", b.status === "missed" && "font-semibold text-red-700")}>{BENEFIT_STATUS_LABELS[b.status]}</td>
                    <td className="px-3 py-2 text-center">{b.appliedCount}</td>
                    <td className="px-3 py-2 text-right">
                      {(b.status === "pending" || b.status === "active") && (
                        <button type="button" onClick={() => void cancelBenefit(b)} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Annuler</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-foreground">Derniers inscrits</h2>
        {signups === null ? (
          <p className="text-sm text-gray-text">Liste réservée aux comptes ayant accès aux leads.</p>
        ) : signups.length === 0 ? (
          <p className="text-sm text-gray-text">Aucune inscription pour l’instant.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray/60 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-text">
                <tr className="border-b border-gray/40">
                  <th className="px-3 py-2">Date</th><th className="px-3 py-2">Nom</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Projet</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Statut du code</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => {
                  const expired = new Date(s.codeExpiresAt).getTime() < loadedAt;
                  return (
                    <tr key={s.id} className="border-t border-gray/30">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2">{s.email}{s.phone && <span className="block text-xs text-gray-text">{s.phone}</span>}</td>
                      <td className="px-3 py-2">{s.projectType ?? "—"}</td>
                      <td className="px-3 py-2 font-mono">{s.code}</td>
                      <td className="px-3 py-2">
                        {s.codeUsedAt ? "Utilisé (devis)" : expired ? "Expiré" : `Valable jusqu’au ${new Date(s.codeExpiresAt).toLocaleDateString("fr-FR")}`}
                        {(s.reminderCount > 0 || s.unsubscribedAt) && (
                          <span className="block text-xs text-gray-text">
                            {s.reminderCount > 0 ? `${s.reminderCount} relance(s)` : ""}
                            {s.reminderCount > 0 && s.unsubscribedAt ? " · " : ""}
                            {s.unsubscribedAt ? "Désinscrit" : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <PopupForm key={editing.key} initial={editing.form} creating={editing.id === null} saving={saving} error={formError} onCancel={() => setEditing(null)} onSubmit={(d) => void save(d)} />
      )}
    </div>
  );
}
