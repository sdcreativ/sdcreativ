"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CrmEmailChrome, CrmSettingsPayload } from "@/lib/crm-settings-types";
import { DEFAULT_CRM_EMAIL_CHROME } from "@/lib/crm-settings-types";
import { fetchCrmSettings, updateCrmEmailChromeApi } from "@/lib/crm-settings-api";
import { wrapEmailHtml } from "@/lib/email-chrome";
import { LOGO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Loader2, Mail } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function previewLogoUrl(logoUrl: string | null | undefined, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  if (!logoUrl?.trim()) return `${base}${LOGO.src}`;
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) return `${base}${trimmed}`;
  return trimmed;
}

const TOGGLE_FIELDS: Array<{ key: keyof CrmEmailChrome; label: string }> = [
  { key: "enabled", label: "Activer l'identité sur tous les emails" },
  { key: "showLogo", label: "Afficher le logo" },
  { key: "showTagline", label: "Afficher le slogan" },
  { key: "showAddress", label: "Adresse" },
  { key: "showPhone", label: "Téléphone" },
  { key: "showEmail", label: "Email" },
  { key: "showWebsite", label: "Site web" },
  { key: "showLegal", label: "Mentions RCCM / NCC" },
];

export function EmailChromeSection() {
  const [settings, setSettings] = useState<CrmSettingsPayload | null>(null);
  const [form, setForm] = useState<CrmEmailChrome>(DEFAULT_CRM_EMAIL_CHROME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCrmSettings();
      setSettings(data);
      setForm(data.emailChrome ?? DEFAULT_CRM_EMAIL_CHROME);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewHtml = useMemo(() => {
    if (!settings) return "";
    const site = settings.sitePublic;
    const branding = settings.branding;
    const siteUrl =
      typeof window !== "undefined" ? window.location.origin : "https://sdcreativ.com";
    const company = {
      agencyName: site?.companyName?.trim() || branding.agencyName,
      tagline: site?.tagline?.trim() || branding.tagline,
      primaryColor: branding.primaryColor,
      accentColor: branding.accentColor,
      logoUrl: previewLogoUrl(site?.logoUrl?.trim() || branding.logoUrl, siteUrl),
      siteUrl,
      phone: site?.phone ?? "",
      email: site?.email ?? "",
      address: site?.address ?? "",
      hours: site?.hours ?? "",
      rccm: site?.rccm ?? "",
      ncc: site?.ncc ?? "",
    };
    return wrapEmailHtml(
      `<p>Bonjour,</p><p>Voici un aperçu du rendu de vos emails (équipe et clients).</p>`,
      company,
      form,
    );
  }, [settings, form]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateCrmEmailChromeApi(form);
      setForm(updated);
      setMessage("Identité email enregistrée.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-gray-text">
        Logo, raison sociale et coordonnées proviennent de{" "}
        <strong className="font-medium text-foreground">Site public</strong> (avec repli sur le
        branding CRM). Vous contrôlez ici ce qui apparaît en en-tête et en pied de tous les emails.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {TOGGLE_FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
              form[key]
                ? "border-primary/40 bg-primary-light/30"
                : "border-gray/30 bg-white hover:border-gray/50",
            )}
          >
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
              className="h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-text">
          Note de pied de page (optionnelle)
        </span>
        <textarea
          value={form.footerNote}
          onChange={(e) => setForm((prev) => ({ ...prev, footerNote: e.target.value }))}
          rows={2}
          maxLength={500}
          placeholder="Ex. Du lundi au vendredi, 9h–18h · Abidjan"
          className={fieldClass}
          aria-label="Note de pied de page email"
        />
      </label>

      <div className="overflow-hidden rounded-2xl border border-gray/30 bg-[#f1f5f9]">
        <div className="flex items-center gap-2 border-b border-gray/25 bg-white/80 px-4 py-2.5">
          <Mail className="h-4 w-4 text-sky-600" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">
            Aperçu
          </span>
        </div>
        <div
          className="max-h-[420px] overflow-auto p-2"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer l'identité email"}
        </button>
        {message && <p className="text-sm text-primary">{message}</p>}
      </div>
    </div>
  );
}
