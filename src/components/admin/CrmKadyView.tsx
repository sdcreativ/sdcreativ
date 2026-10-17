"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Loader2, RotateCcw } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SiteImageUploadField } from "@/components/admin/SiteImageUploadField";
import { KadyAdminTabs } from "@/components/admin/KadyAdminTabs";
import { useDialog } from "@/components/ui/DialogProvider";
import {
  CrmFormActions,
  CrmFormField,
  CrmFormHeader,
  CrmFormSection,
  CrmFormStatus,
  CrmSecondaryButton,
  crmFieldClass,
} from "@/components/admin/crm-site-form-ui";
import { parseFetchJson } from "@/lib/fetch-json";
import { resetAssistantNameCache } from "@/hooks/useAssistantName";
import {
  DEFAULT_KADY_APPEARANCE,
  KADY_FONT_LABELS,
  KADY_FONTS,
  KADY_LAUNCHER_ANIMATION_LABELS,
  KADY_LAUNCHER_ANIMATIONS,
  KADY_LAUNCHER_ICON_LABELS,
  KADY_LAUNCHER_ICONS,
  KADY_LAUNCHER_STYLE_LABELS,
  KADY_LAUNCHER_STYLES,
  KADY_PANEL_ANIMATION_LABELS,
  KADY_PANEL_ANIMATIONS,
  KADY_POSITION_LABELS,
  KADY_POSITIONS,
  kadyContrastWarnings,
  type KadyAppearance,
} from "@/lib/kady-appearance";
import { getAiGreeting } from "@/lib/threecx/ai-coexistence";
import { cn } from "@/lib/utils";

const COLOR_FIELDS: Array<{ key: keyof KadyAppearance["colors"]; label: string; hint: string }> = [
  { key: "accent", label: "Couleur principale", hint: "Bouton d'ouverture, messages du visiteur, Envoyer" },
  { key: "accentText", label: "Texte sur la couleur principale", hint: "" },
  { key: "headerBg", label: "En-tête", hint: "Bandeau avec la photo et le nom" },
  { key: "headerText", label: "Texte de l'en-tête", hint: "" },
  { key: "botBubble", label: "Bulles de l'assistante", hint: "" },
  { key: "botText", label: "Texte des bulles de l'assistante", hint: "" },
  { key: "panelBg", label: "Fond de la fenêtre", hint: "" },
];

async function saveAppearance(appearance: KadyAppearance): Promise<KadyAppearance> {
  const res = await fetch("/api/admin/site-kady", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appearance),
  });
  return (await parseFetchJson<{ appearance: KadyAppearance }>(res)).appearance;
}

/** CRM → Site → Assistante : identité et apparence de l'assistance virtuelle, avec aperçu en direct. */
export function CrmKadyView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<KadyAppearance | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewLocale, setPreviewLocale] = useState<"fr" | "en">("fr");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site-kady", { credentials: "include" });
      setForm((await parseFetchJson<{ appearance: KadyAppearance }>(res)).appearance);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewMessages = useMemo(() => {
    if (!form) return [];
    const isEn = previewLocale === "en";
    const greeting = getAiGreeting("default", previewLocale, {
      name: form.name,
      greeting: isEn ? form.greetingEn : form.greetingFr,
    });
    return [
      { role: "assistant" as const, content: greeting.content },
      { role: "user" as const, content: isEn ? "How long does a website take?" : "Combien de temps pour créer un site ?" },
      {
        role: "assistant" as const,
        content: isEn
          ? "Usually 15 to 30 days for a website. Would you like a free quote?"
          : "En général 15 à 30 jours pour un site vitrine. Voulez-vous un devis gratuit ?",
      },
    ];
  }, [form, previewLocale]);

  if (!form) {
    return (
      <div className="space-y-4">
        <CrmFormStatus message={message} />
        {!message && (
          <p className="flex items-center gap-2 py-12 text-sm text-gray-text">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
            Chargement…
          </p>
        )}
      </div>
    );
  }

  const set = <K extends keyof KadyAppearance>(key: K, value: KadyAppearance[K]) => setForm({ ...form, [key]: value });
  const setColor = (key: keyof KadyAppearance["colors"], value: string) =>
    setForm({ ...form, colors: { ...form.colors, [key]: value.toUpperCase() } });
  const warnings = kadyContrastWarnings(form);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const saved = await saveAppearance(form);
      setForm(saved);
      resetAssistantNameCache();
      setMessage(`${saved.name} enregistrée — visible sur le site d'ici quelques secondes.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Revenir à l'apparence d'origine ?",
      message: "Nom, photo, couleurs, police et animations reprennent leurs valeurs par défaut.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      setForm(await saveAppearance(DEFAULT_KADY_APPEARANCE));
      setMessage("Apparence d'origine restaurée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <CrmFormHeader
        icon={Bot}
        title={`Assistante virtuelle — ${form.name}`}
        description="Nom, photo, couleurs, police, position et animations du chat présent sur tout le site. L'aperçu se met à jour en direct."
        actions={
          <CrmSecondaryButton onClick={() => void handleReset()} disabled={saving}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </CrmSecondaryButton>
        }
      />
      <KadyAdminTabs />
      <CrmFormStatus message={message} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <form id="crm-kady-form" onSubmit={(e) => void handleSubmit(e)} className="min-w-0 space-y-6">
          <CrmFormSection title="Identité" description="Le nom est aussi utilisé par l'IA pour se présenter.">
            <div className="grid gap-4 sm:grid-cols-3">
              <CrmFormField label="Nom">
                <input
                  id="kady-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  minLength={2}
                  maxLength={30}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <CrmFormField label="Fonction (FR)">
                <input
                  id="kady-role-fr"
                  value={form.roleFr}
                  onChange={(e) => set("roleFr", e.target.value)}
                  required
                  maxLength={60}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <CrmFormField label="Fonction (EN)">
                <input
                  id="kady-role-en"
                  value={form.roleEn}
                  onChange={(e) => set("roleEn", e.target.value)}
                  required
                  maxLength={60}
                  className={crmFieldClass}
                />
              </CrmFormField>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <CrmFormField label="Message d'accueil (FR)" hint="Vide = message par défaut avec le nom.">
                <textarea
                  id="kady-greeting-fr"
                  value={form.greetingFr}
                  onChange={(e) => set("greetingFr", e.target.value)}
                  maxLength={400}
                  rows={3}
                  className={crmFieldClass}
                />
              </CrmFormField>
              <CrmFormField label="Message d'accueil (EN)" hint="Vide = message par défaut avec le nom.">
                <textarea
                  id="kady-greeting-en"
                  value={form.greetingEn}
                  onChange={(e) => set("greetingEn", e.target.value)}
                  maxLength={400}
                  rows={3}
                  className={crmFieldClass}
                />
              </CrmFormField>
            </div>
            <p className="mt-2 text-xs text-gray-text">
              Hors horaires ou quand un conseiller est en ligne, le message d&apos;accueil reste celui prévu pour ces
              situations.
            </p>
          </CrmFormSection>

          <CrmFormSection title="Photo et bouton d'ouverture">
            <div className="grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
              <SiteImageUploadField
                value={form.avatarUrl}
                onChange={(url) => set("avatarUrl", url || DEFAULT_KADY_APPEARANCE.avatarUrl)}
                preview="square"
                clearable={false}
                label="Changer la photo"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <CrmFormField label="Le bouton affiche">
                  <select
                    id="kady-launcher-style"
                    value={form.launcherStyle}
                    onChange={(e) => set("launcherStyle", e.target.value as KadyAppearance["launcherStyle"])}
                    className={crmFieldClass}
                  >
                    {KADY_LAUNCHER_STYLES.map((v) => (
                      <option key={v} value={v}>
                        {KADY_LAUNCHER_STYLE_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </CrmFormField>
                <CrmFormField label="Icône" hint={form.launcherStyle === "icon" ? undefined : "Utilisée avec « Icône »."}>
                  <select
                    id="kady-launcher-icon"
                    value={form.launcherIcon}
                    onChange={(e) => set("launcherIcon", e.target.value as KadyAppearance["launcherIcon"])}
                    className={crmFieldClass}
                  >
                    {KADY_LAUNCHER_ICONS.map((v) => (
                      <option key={v} value={v}>
                        {KADY_LAUNCHER_ICON_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </CrmFormField>
                <CrmFormField label={`Taille du bouton : ${form.launcherSize} px`}>
                  <input
                    id="kady-launcher-size"
                    type="range"
                    min={48}
                    max={72}
                    step={2}
                    value={form.launcherSize}
                    onChange={(e) => set("launcherSize", Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </CrmFormField>
                <label className="flex items-center gap-2.5 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.showNameOnLauncher}
                    onChange={(e) => set("showNameOnLauncher", e.target.checked)}
                    className="h-4 w-4 rounded border-gray/60"
                  />
                  Afficher le nom à côté (ordinateur)
                </label>
              </div>
            </div>
          </CrmFormSection>

          <CrmFormSection title="Position et animations">
            <div className="grid gap-4 sm:grid-cols-3">
              <CrmFormField
                label="Position"
                hint={form.position === "right" ? "WhatsApp passe alors à gauche. Forcée à gauche quand le Live Chat conseiller est affiché." : undefined}
              >
                <select
                  id="kady-position"
                  value={form.position}
                  onChange={(e) => set("position", e.target.value as KadyAppearance["position"])}
                  className={crmFieldClass}
                >
                  {KADY_POSITIONS.map((v) => (
                    <option key={v} value={v}>
                      {KADY_POSITION_LABELS[v]}
                    </option>
                  ))}
                </select>
              </CrmFormField>
              <CrmFormField label="Animation du bouton" hint="Désactivée si le visiteur limite les animations.">
                <select
                  id="kady-launcher-animation"
                  value={form.launcherAnimation}
                  onChange={(e) => set("launcherAnimation", e.target.value as KadyAppearance["launcherAnimation"])}
                  className={crmFieldClass}
                >
                  {KADY_LAUNCHER_ANIMATIONS.map((v) => (
                    <option key={v} value={v}>
                      {KADY_LAUNCHER_ANIMATION_LABELS[v]}
                    </option>
                  ))}
                </select>
              </CrmFormField>
              <CrmFormField label="Ouverture de la fenêtre">
                <select
                  id="kady-panel-animation"
                  value={form.panelAnimation}
                  onChange={(e) => set("panelAnimation", e.target.value as KadyAppearance["panelAnimation"])}
                  className={crmFieldClass}
                >
                  {KADY_PANEL_ANIMATIONS.map((v) => (
                    <option key={v} value={v}>
                      {KADY_PANEL_ANIMATION_LABELS[v]}
                    </option>
                  ))}
                </select>
              </CrmFormField>
            </div>
          </CrmFormSection>

          <CrmFormSection title="Texte">
            <div className="grid gap-4 sm:grid-cols-2">
              <CrmFormField label="Police" hint="Polices sans téléchargement : aucun ralentissement du site.">
                <select
                  id="kady-font"
                  value={form.font}
                  onChange={(e) => set("font", e.target.value as KadyAppearance["font"])}
                  className={crmFieldClass}
                >
                  {KADY_FONTS.map((v) => (
                    <option key={v} value={v}>
                      {KADY_FONT_LABELS[v]}
                    </option>
                  ))}
                </select>
              </CrmFormField>
              <CrmFormField label={`Taille du texte : ${form.fontSize} px`}>
                <input
                  id="kady-font-size"
                  type="range"
                  min={12}
                  max={18}
                  value={form.fontSize}
                  onChange={(e) => set("fontSize", Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </CrmFormField>
            </div>
          </CrmFormSection>

          <CrmFormSection title="Couleurs">
            <div className="grid gap-4 sm:grid-cols-2">
              {COLOR_FIELDS.map(({ key, label, hint }) => (
                <CrmFormField key={key} label={label} hint={hint || undefined}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={label}
                      value={form.colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray/60 bg-white p-1"
                    />
                    <input
                      id={`kady-color-${key}`}
                      value={form.colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      pattern="#[0-9A-Fa-f]{6}"
                      maxLength={7}
                      className={cn(crmFieldClass, "font-mono uppercase")}
                    />
                  </div>
                </CrmFormField>
              ))}
            </div>
            {warnings.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  Lisibilité à vérifier
                </p>
                <ul className="mt-1 list-disc pl-6">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </CrmFormSection>

          <CrmFormActions saving={saving} formId="crm-kady-form" />
        </form>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">Aperçu</p>
            <div className="flex gap-1 rounded-xl border border-gray/30 bg-gray-light/30 p-1 text-xs">
              {[
                { label: "Ouvert", active: previewOpen, onClick: () => setPreviewOpen(true) },
                { label: "Fermé", active: !previewOpen, onClick: () => setPreviewOpen(false) },
                { label: "FR", active: previewLocale === "fr", onClick: () => setPreviewLocale("fr") },
                { label: "EN", active: previewLocale === "en", onClick: () => setPreviewLocale("en") },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={b.onClick}
                  className={cn("rounded-lg px-2.5 py-1 font-medium", b.active ? "bg-white shadow-sm" : "text-gray-text")}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div
            className="relative h-[620px] overflow-hidden rounded-2xl border border-gray/40 bg-gradient-to-b from-gray-light to-white"
            aria-label="Aperçu du chat sur une page du site"
          >
            <div className="space-y-3 p-6" aria-hidden>
              <div className="h-4 w-2/3 rounded bg-gray/30" />
              <div className="h-3 w-full rounded bg-gray/20" />
              <div className="h-3 w-5/6 rounded bg-gray/20" />
              <div className="h-24 w-full rounded-xl bg-gray/15" />
            </div>
            <ChatWidget
              key={`${previewLocale}-${form.panelAnimation}`}
              locale={previewLocale}
              appearance={form}
              preview={{ open: previewOpen, messages: previewMessages }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
