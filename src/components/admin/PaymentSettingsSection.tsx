"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaymentSettings } from "@/lib/payment-settings-types";
import {
  fetchPaymentSettings,
  updatePaymentSettingsApi,
} from "@/lib/payment-settings-api";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2 } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function PaymentSettingsSection() {
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [cinetPayConfigured, setCinetPayConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { settings, cinetPayConfigured: configured } = await fetchPaymentSettings();
      setForm(settings);
      setCinetPayConfigured(configured);
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
      const { settings, cinetPayConfigured: configured } = await updatePaymentSettingsApi(form);
      setForm(settings);
      setCinetPayConfigured(configured);
      setMessage("Coordonnées de paiement enregistrées.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
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
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Ces informations apparaissent sur les factures PDF, les emails et l&apos;espace client.
          Le paiement en ligne CinetPay nécessite les clés API serveur (<code>CINETPAY_API_KEY</code>,{" "}
          <code>CINETPAY_SITE_ID</code>).
        </span>
      </p>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Virement bancaire</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Titulaire du compte *
            </span>
            <input
              required
              value={form.accountHolder}
              onChange={(e) => updateField("accountHolder", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Banque
            </span>
            <input
              value={form.bankName}
              onChange={(e) => updateField("bankName", e.target.value)}
              className={fieldClass}
              placeholder="Ex. Ecobank, SGBCI…"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              BIC / SWIFT
            </span>
            <input
              value={form.bic}
              onChange={(e) => updateField("bic", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              IBAN / RIB / N° de compte
            </span>
            <input
              value={form.iban}
              onChange={(e) => updateField("iban", e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Mobile Money</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Orange Money
            </span>
            <input
              value={form.orangeMoneyNumber}
              onChange={(e) => updateField("orangeMoneyNumber", e.target.value)}
              className={fieldClass}
              placeholder="+225 07 …"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              Wave
            </span>
            <input
              value={form.waveNumber}
              onChange={(e) => updateField("waveNumber", e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
              MTN MoMo
            </span>
            <input
              value={form.mtnMomoNumber}
              onChange={(e) => updateField("mtnMomoNumber", e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">
          Consigne affichée au client
        </span>
        <textarea
          rows={3}
          value={form.paymentNote}
          onChange={(e) => updateField("paymentNote", e.target.value)}
          className={cn(fieldClass, "resize-y")}
        />
      </label>

      <fieldset className="rounded-xl border border-gray/30 bg-gray-light/20 p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">Paiement en ligne (CinetPay)</legend>
        <label className="mt-2 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.onlineEnabled}
            onChange={(e) => updateField("onlineEnabled", e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray/60 text-primary focus:ring-primary/30"
          />
          <span className="text-sm text-gray-text">
            Proposer le bouton « Payer en ligne » dans l&apos;espace client (carte bancaire + Mobile Money CI).
          </span>
        </label>
        <p className="mt-3 text-xs text-gray-text">
          {cinetPayConfigured ? (
            <span className="font-medium text-emerald-700">Clés CinetPay détectées sur le serveur.</span>
          ) : (
            <span className="text-amber-700">
              Clés CinetPay absentes — seules les instructions manuelles seront proposées.
            </span>
          )}
        </p>
      </fieldset>

      {message && (
        <p
          className={cn(
            "rounded-xl px-4 py-3 text-sm",
            message.includes("Erreur") || message.includes("Impossible")
              ? "border border-accent/30 bg-accent/5 text-accent"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Enregistrer
      </button>
    </form>
  );
}
