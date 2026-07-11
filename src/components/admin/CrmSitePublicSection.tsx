"use client";

import { useCallback, useEffect, useState } from "react";
import type { SitePublicSettings } from "@/lib/site-public-types";
import { fetchCrmSettings, updateSitePublicSettingsApi } from "@/lib/crm-settings-api";
import { cn } from "@/lib/utils";
import { Globe, Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function SitePublicSection() {
  const [form, setForm] = useState<SitePublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await fetchCrmSettings();
      if (settings.sitePublic) setForm(settings.sitePublic);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Impossible de charger les paramètres.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateSitePublicSettingsApi(form);
      setForm(updated);
      setMessage("Paramètres du site enregistrés — le site public sera mis à jour sous quelques secondes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SitePublicSettings>(key: K, value: SitePublicSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading || !form) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Globe className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Ces informations apparaissent sur le footer, la page contact, les mentions légales, les
          factures PDF et le référencement (JSON-LD).
        </span>
      </p>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Identité entreprise</legend>
        <p className="text-xs text-gray-text">
          Utilisée sur les factures et devis PDF (logo, raison sociale, slogan).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Raison sociale
            </span>
            <input
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              className={fieldClass}
              aria-label="Raison sociale"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Slogan / activité
            </span>
            <input
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              className={fieldClass}
              placeholder="Agence Web & Solutions Digitales"
              aria-label="Slogan"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Logo (URL ou chemin)
            </span>
            <input
              value={form.logoUrl}
              onChange={(e) => updateField("logoUrl", e.target.value)}
              className={fieldClass}
              placeholder="/images/logo_sd.svg ou https://…"
              aria-label="URL du logo"
            />
            {form.logoUrl.trim() && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray/30 bg-gray-light/30 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl.startsWith("/") ? form.logoUrl : form.logoUrl}
                  alt="Aperçu logo"
                  className="h-12 max-w-[160px] object-contain"
                />
                <span className="text-xs text-gray-text">Aperçu du logo facture</span>
              </div>
            )}
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Coordonnées</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Téléphone
            </span>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={fieldClass}
              aria-label="Téléphone"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Email affiché sur le site
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={fieldClass}
              aria-label="Email affiché sur le site"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Adresse
            </span>
            <input
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className={fieldClass}
              aria-label="Adresse"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Horaires
            </span>
            <input
              value={form.hours}
              onChange={(e) => updateField("hours", e.target.value)}
              className={fieldClass}
              aria-label="Horaires"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">WhatsApp</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Numéro (chiffres, ex. 22507XXXXXXXX)
            </span>
            <input
              value={form.whatsapp}
              onChange={(e) => updateField("whatsapp", e.target.value.replace(/\D/g, ""))}
              className={fieldClass}
              aria-label="Numéro WhatsApp"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Message prérempli
            </span>
            <input
              value={form.whatsappMessage}
              onChange={(e) => updateField("whatsappMessage", e.target.value)}
              className={fieldClass}
              aria-label="Message WhatsApp prérempli"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Réseaux sociaux</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["facebook", "Facebook"],
              ["linkedin", "LinkedIn"],
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                {label}
              </span>
              <input
                type="url"
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className={fieldClass}
                placeholder="https://"
                aria-label={label}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Mentions légales</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              RCCM
            </span>
            <input
              value={form.rccm}
              onChange={(e) => updateField("rccm", e.target.value)}
              className={fieldClass}
              aria-label="RCCM"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              NCC
            </span>
            <input
              value={form.ncc}
              onChange={(e) => updateField("ncc", e.target.value)}
              className={fieldClass}
              aria-label="NCC"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Hébergeur
            </span>
            <input
              value={form.hostName}
              onChange={(e) => updateField("hostName", e.target.value)}
              className={fieldClass}
              aria-label="Nom hébergeur"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Adresse hébergeur
            </span>
            <input
              value={form.hostAddress}
              onChange={(e) => updateField("hostAddress", e.target.value)}
              className={fieldClass}
              aria-label="Adresse hébergeur"
            />
          </label>
        </div>
      </fieldset>

      {message && (
        <p
          className={cn(
            "text-sm",
            message.includes("enregistr") ? "text-emerald-700" : "text-red-600",
          )}
          role="status"
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer
      </button>
    </form>
  );
}
