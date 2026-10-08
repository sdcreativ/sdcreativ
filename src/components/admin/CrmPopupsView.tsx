"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Gift, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useDialog } from "@/components/ui/DialogProvider";
import { CrmFormField, CrmFormHeader, crmFieldClass } from "@/components/admin/crm-site-form-ui";
import { SitePopupCard } from "@/components/popups/SitePopupCard";
import { parseFetchJson } from "@/lib/fetch-json";
import type { PopupSignup } from "@/lib/site-popups";
import {
  DEFAULT_SITE_POPUP,
  POPUP_PROJECT_TYPES,
  type SitePopup,
  type SitePopupInput,
} from "@/lib/site-popups-types";
import { cn } from "@/lib/utils";

const api = {
  list: async () => (await parseFetchJson<{ popups: SitePopup[] }>(await fetch("/api/admin/site-popups", { credentials: "include" }))).popups,
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
};

const rate = (signups: number, impressions: number) =>
  impressions > 0 ? `${((signups / impressions) * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %` : "—";

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
  const [signups, setSignups] = useState<PopupSignup[] | null>(null);
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
      setPopups(await api.list());
      setSignups(await api.signups().catch(() => null));
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
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => open(p)} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light"><Pencil className="h-3 w-3" aria-hidden />Modifier</button>
                <button type="button" onClick={() => void toggle(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 rounded-lg border border-gray/60 px-2 py-1 text-xs font-medium hover:bg-gray-light disabled:opacity-60">{p.isActive ? <><EyeOff className="h-3 w-3" aria-hidden />Désactiver</> : <><Eye className="h-3 w-3" aria-hidden />Activer</>}</button>
                <button type="button" onClick={() => void remove(p)} disabled={busyId === p.id} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-3 w-3" aria-hidden />Supprimer</button>
              </div>
            </article>
          ))
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
                      <td className="px-3 py-2">{s.codeUsedAt ? "Utilisé (devis)" : expired ? "Expiré" : `Valable jusqu’au ${new Date(s.codeExpiresAt).toLocaleDateString("fr-FR")}`}</td>
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
