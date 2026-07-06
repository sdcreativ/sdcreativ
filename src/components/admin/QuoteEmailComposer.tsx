"use client";

import { useState } from "react";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { sendQuoteEmailApi } from "@/lib/quotes-api";
import { Loader2, Mail, X } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  quoteId: string;
  quoteReference: string;
  quoteEmail: string;
  quoteName: string;
  quoteAmount: number;
  onClose: () => void;
  onSent: () => void;
};

export function QuoteEmailComposer({
  quoteId,
  quoteReference,
  quoteEmail,
  quoteName,
  quoteAmount,
  onClose,
  onSent,
}: Props) {
  const [subject, setSubject] = useState(`Devis ${quoteReference} — SD CREATIV`);
  const [body, setBody] = useState(
    `Bonjour ${quoteName.split(" ")[0] ?? quoteName},\n\nVeuillez trouver ci-joint notre devis ${quoteReference} d'un montant de ${formatQuoteAmount(quoteAmount)}.\n\nNous restons à votre disposition pour en discuter.\n\nCordialement,`,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendQuoteEmailApi(quoteId, { subject: subject.trim(), body: body.trim() });
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Mail className="h-5 w-5 text-primary" aria-hidden />
              Envoyer le devis
            </h2>
            <p className="text-sm text-gray-text">À {quoteEmail}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X className="h-5 w-5 text-gray-text" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Objet
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required className={`${fieldClass} mt-1`} />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-text">
            Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={8} className={`${fieldClass} mt-1`} />
          </label>
          <p className="text-xs text-gray-text">
            Le récapitulatif du devis (montant et lignes) sera inclus automatiquement dans l&apos;email.
          </p>
        </div>

        {error && <p className="mt-3 text-sm text-accent">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray/60 py-2.5 text-sm font-medium hover:bg-gray-light">
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
