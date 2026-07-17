"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrmBranding, CrmEmailTemplate, CrmSettingsPayload } from "@/lib/crm-settings-types";
import type { CrmAuditLog } from "@/lib/crm-audit";
import {
  fetchCrmAuditLogs,
  fetchCrmSettings,
  sendTestEmailTemplateApi,
  updateCrmBrandingApi,
  updateCrmEmailTemplateApi,
} from "@/lib/crm-settings-api";
import { LOGO } from "@/lib/constants";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";
import { Loader2, Palette, Send } from "lucide-react";
import { Logo, LOGO_IMAGE_SIZES } from "@/components/ui/Logo";
import { SiteLogoUploadField } from "@/components/admin/SiteLogoUploadField";
import { useCrmBranding } from "@/components/admin/CrmBrandingProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function PermissionsMatrixSection() {
  return (
    <p className="text-sm text-gray-text">
      La matrice est affichée dans l&apos;onglet Équipe une fois les rôles chargés.
    </p>
  );
}

export function BrandingSection() {
  const { branding: ctxBranding, loading: ctxLoading, setBranding: applyBranding } = useCrmBranding();
  const [branding, setBranding] = useState<CrmBranding | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ctxLoading) setBranding(ctxBranding);
  }, [ctxBranding, ctxLoading]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!branding) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateCrmBrandingApi(branding);
      setBranding(updated);
      applyBranding(updated);
      setMessage("Branding enregistré.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading || !branding) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Nom de l&apos;agence
            </span>
            <input
              value={branding.agencyName}
              onChange={(e) => setBranding({ ...branding, agencyName: e.target.value })}
              className={fieldClass}
              aria-label="Nom de l'agence"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Slogan
            </span>
            <input
              value={branding.tagline}
              onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
              className={fieldClass}
              aria-label="Slogan"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Couleur principale
            </span>
            <div className="flex gap-2">
              <input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-xl border border-gray/60 shadow-sm"
                aria-label="Couleur principale"
              />
              <input
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className={fieldClass}
                aria-label="Code couleur principale"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Couleur accent
            </span>
            <div className="flex gap-2">
              <input
                type="color"
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-xl border border-gray/60 shadow-sm"
                aria-label="Couleur accent"
              />
              <input
                value={branding.accentColor}
                onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                className={fieldClass}
                aria-label="Code couleur accent"
              />
            </div>
          </label>
          <div className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Logo CRM (optionnel)
            </span>
            <SiteLogoUploadField
              value={branding.logoUrl ?? ""}
              onChange={(url) =>
                setBranding({
                  ...branding,
                  logoUrl: !url || url === LOGO.src ? null : url,
                })
              }
            />
            <p className="mt-1.5 text-xs text-gray-text">
              Affiché dans la sidebar CRM. Upload vers S3 (ou stockage local en dev).
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl border border-gray/30 p-5 shadow-inner"
          style={{
            background: `linear-gradient(135deg, ${branding.primaryColor}18, ${branding.accentColor}12)`,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-text">Aperçu</p>
          <div className="mt-3 rounded-xl bg-[#071525] px-4 py-3">
            {branding.logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveImageDisplayUrl(branding.logoUrl.trim())}
                alt={branding.agencyName}
                className={cn(LOGO_IMAGE_SIZES.sidebar, "max-w-40 object-contain object-left")}
              />
            ) : (
              <Logo href={null} variant="mark" size="sidebar" onDark className="max-w-40" />
            )}
          </div>
          <p className="mt-3 text-lg font-bold" style={{ color: branding.primaryColor }}>
            {branding.agencyName}
          </p>
          <p className="mt-1 text-xs text-gray-text">{branding.tagline}</p>
          <div className="mt-4 flex gap-2">
            <span
              className="h-8 flex-1 rounded-lg shadow-sm"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <span
              className="h-8 w-12 rounded-lg shadow-sm"
              style={{ backgroundColor: branding.accentColor }}
            />
          </div>
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-primary-light/40 px-3 py-2 text-sm font-medium text-primary">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-50"
      >
        <Palette className="h-4 w-4" aria-hidden />
        {saving ? "Enregistrement…" : "Enregistrer le branding"}
      </button>
    </form>
  );
}

export function EmailTemplatesSection() {
  const [settings, setSettings] = useState<CrmSettingsPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCrmSettings();
      setSettings(data);
      const first = Object.keys(data.emailTemplates)[0];
      if (first) {
        setSelectedId((prev) => {
          const id = prev ?? first;
          const tpl = data.emailTemplates[id] ?? data.emailTemplates[first]!;
          setSubject(tpl.subject);
          setHtmlBody(tpl.htmlBody);
          return id;
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function selectTemplate(tpl: CrmEmailTemplate) {
    setSelectedId(tpl.id);
    setSubject(tpl.subject);
    setHtmlBody(tpl.htmlBody);
    setMessage("");
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setMessage("");
    try {
      await updateCrmEmailTemplateApi({ id: selectedId, subject, htmlBody });
      setMessage("Modèle enregistré.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    if (!selectedId || !testEmail) return;
    setSaving(true);
    setMessage("");
    try {
      await sendTestEmailTemplateApi(selectedId, testEmail);
      setMessage(`Email test envoyé à ${testEmail}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  const templates = Object.values(settings.emailTemplates);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        Variables disponibles : <code className="rounded bg-gray-light px-1">{`{{name}}`}</code>,{" "}
        <code className="rounded bg-gray-light px-1">{`{{agencyName}}`}</code>,{" "}
        <code className="rounded bg-gray-light px-1">{`{{service}}`}</code>,{" "}
        <code className="rounded bg-gray-light px-1">{`{{projet}}`}</code>.
      </p>
      <div className="flex flex-wrap gap-2">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => selectTemplate(tpl)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
              selectedId === tpl.id
                ? "border-primary bg-primary-light/40 text-primary"
                : "border-gray/40 text-gray-text hover:text-foreground",
            )}
          >
            {tpl.label}
          </button>
        ))}
      </div>
      {selectedId && (
        <div className="space-y-4 rounded-xl border border-gray/30 bg-gradient-to-br from-gray-light/30 to-white p-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Objet</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} aria-label="Objet de l'email" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-text">Corps HTML</span>
            <textarea
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              rows={8}
              className={fieldClass}
              aria-label="Corps HTML de l'email"
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block flex-1 min-w-[200px]">
              <span className="mb-1 block text-xs font-medium text-gray-text">Email test</span>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="vous@example.com"
                className={fieldClass}
                aria-label="Adresse pour envoi test"
              />
            </label>
            <button
              type="button"
              disabled={saving || !testEmail}
              onClick={() => void handleTestSend()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-4 py-2.5 text-sm font-medium hover:bg-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden />
              Envoyer test
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}

export function AuditLogSection() {
  const [logs, setLogs] = useState<CrmAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCrmAuditLogs(40)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement…
      </p>
    );
  }

  if (logs.length === 0) {
    return <p className="text-sm text-gray-text">Aucune entrée pour le moment.</p>;
  }

  return (
    <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
      {logs.map((log) => (
        <li
          key={log.id}
          className="rounded-xl border border-gray/25 bg-gray-light/20 px-4 py-3.5 text-sm transition-colors hover:border-gray/40 hover:bg-white"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">{log.summary}</span>
            <time className="text-[10px] text-gray-text">
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(log.createdAt))}
            </time>
          </div>
          <p className="mt-1 text-xs text-gray-text">
            {log.actorName} · {log.action} · {log.entityType}
          </p>
        </li>
      ))}
    </ul>
  );
}
