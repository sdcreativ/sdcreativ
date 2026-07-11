"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Shield,
  User,
} from "lucide-react";
import type { ClientPortalSettingsPayload } from "@/lib/client-portal-settings-api";
import {
  fetchPortalSettings,
  rotatePortalAccessCode,
  updatePortalSettings,
} from "@/lib/client-portal-settings-api";
import { cn } from "@/lib/utils";

type Props = {
  onProfileUpdated?: () => void;
};

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 md:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-text">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray/30 px-4 py-3 hover:bg-gray-light/30">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-gray-text">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary"
      />
    </label>
  );
}

export function ClientPortalSettingsView({ onProfileUpdated }: Props) {
  const [settings, setSettings] = useState<ClientPortalSettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notifyQuotes, setNotifyQuotes] = useState(true);
  const [notifyInvoices, setNotifyInvoices] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);

  const [currentToken, setCurrentToken] = useState("");
  const [rotating, setRotating] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applySettings = useCallback((data: ClientPortalSettingsPayload) => {
    setSettings(data);
    setName(data.name);
    setPhone(data.phone ?? "");
    setCompany(data.company ?? "");
    setNotifyQuotes(data.notifications.notifyQuotes);
    setNotifyInvoices(data.notifications.notifyInvoices);
    setNotifyMessages(data.notifications.notifyMessages);
    setNotifyReminders(data.notifications.notifyReminders);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPortalSettings();
      applySettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const data = await updatePortalSettings({
        name,
        phone: phone.trim() || null,
        company: company.trim() || null,
        notifications: {
          notifyQuotes,
          notifyInvoices,
          notifyMessages,
          notifyReminders,
        },
      });
      applySettings(data);
      setSaved(true);
      onProfileUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRotateAccessCode(e: React.FormEvent) {
    e.preventDefault();
    setRotating(true);
    setError("");
    setNewAccessCode(null);
    try {
      const { accessCode } = await rotatePortalAccessCode(currentToken);
      setNewAccessCode(accessCode);
      setCurrentToken("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation impossible.");
    } finally {
      setRotating(false);
    }
  }

  async function copyAccessCode() {
    if (!newAccessCode) return;
    await navigator.clipboard.writeText(newAccessCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement des paramètres…
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="rounded-2xl border border-accent/20 bg-accent/5 px-5 py-8 text-center text-sm text-accent">
        {error}
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        <SettingsSection
          title="Coordonnées"
          description="Informations affichées sur vos documents et échanges."
          icon={User}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Nom complet
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray/50 px-4 py-2.5 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Entreprise
              </span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-xl border border-gray/50 px-4 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Téléphone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray/50 px-4 py-2.5 text-sm"
                placeholder="+225 …"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                Email
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-gray/30 bg-gray-light/40 px-4 py-2.5 text-sm text-gray-text">
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {settings.email}
              </div>
              <p className="mt-1.5 text-xs text-gray-text">
                Pour modifier votre email, contactez votre interlocuteur SD CREATIV.
              </p>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Préférences de notification"
          description="Choisissez les alertes que vous souhaitez recevoir par email."
          icon={Bell}
        >
          <div className="space-y-2">
            <ToggleRow
              label="Nouveaux devis"
              description="Email lorsqu'un devis est publié dans votre espace."
              checked={notifyQuotes}
              onChange={setNotifyQuotes}
            />
            <ToggleRow
              label="Factures"
              description="Email lorsqu'une facture est émise ou relancée."
              checked={notifyInvoices}
              onChange={setNotifyInvoices}
            />
            <ToggleRow
              label="Messages support"
              description="Email lors d'une réponse sur vos tickets."
              checked={notifyMessages}
              onChange={setNotifyMessages}
            />
            <ToggleRow
              label="Rappels d'échéance"
              description="Email avant l'échéance d'un devis ou d'une facture."
              checked={notifyReminders}
              onChange={setNotifyReminders}
            />
          </div>
          <p className="mt-3 text-xs text-gray-text">
            Les alertes in-app (cloche) restent actives indépendamment de ces préférences.
          </p>
        </SettingsSection>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Enregistrer
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" aria-hidden />
              Modifications enregistrées
            </span>
          )}
        </div>
      </form>

      <SettingsSection
        title="Sécurité du compte"
        description="Identifiant et code d'accès à votre espace client."
        icon={Shield}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray/30 bg-gray-light/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">
              Identifiant espace client
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">
              {settings.portalClientId}
            </p>
          </div>

          {settings.hasDatabaseAccess ? (
            <form onSubmit={(e) => void handleRotateAccessCode(e)} className="space-y-3">
              <p className="text-sm text-gray-text">
                Pour renouveler votre code d&apos;accès, saisissez le code actuel. L&apos;ancien
                code sera immédiatement invalidé.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
                  Code d&apos;accès actuel
                </span>
                <input
                  type="password"
                  value={currentToken}
                  onChange={(e) => setCurrentToken(e.target.value)}
                  className="w-full rounded-xl border border-gray/50 px-4 py-2.5 text-sm"
                  autoComplete="current-password"
                  minLength={8}
                  required
                />
              </label>
              <button
                type="submit"
                disabled={rotating || !currentToken}
                className="inline-flex items-center gap-2 rounded-xl border border-gray/50 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-light/50 disabled:opacity-60"
              >
                {rotating ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden />
                )}
                Générer un nouveau code
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-text">
              Votre code d&apos;accès est géré par SD CREATIV. Contactez votre interlocuteur pour
              le renouveler.
            </p>
          )}

          {newAccessCode && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">Nouveau code généré</p>
              <p className="mt-1 text-xs text-emerald-800">
                Copiez ce code maintenant — il ne sera plus affiché.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm text-foreground">
                  {newAccessCode}
                </code>
                <button
                  type="button"
                  onClick={() => void copyAccessCode()}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",
                    copied
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-white text-primary hover:bg-emerald-100",
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copier
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
