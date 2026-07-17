"use client";

import { useEffect, useState } from "react";
import { formatFcfaShort } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type PortalPaymentStatus,
  type PortalPaymentsPayload,
} from "@/lib/client-portal-payments";
import { Loader2 } from "lucide-react";

const STATUS_COLORS: Record<PortalPaymentStatus, string> = {
  paid: "text-emerald-600",
  pending: "text-amber-600",
  due: "text-orange-600",
  overdue: "text-accent",
};

export function ClientPortalPaymentsView() {
  const [data, setData] = useState<PortalPaymentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/espace-client/payments", { credentials: "include" })
      .then(async (res) => {
        const json = (await res.json()) as PortalPaymentsPayload & { error?: string };
        if (!res.ok) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Chargement impossible.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement des paiements…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-accent/30 bg-white p-8 text-center text-sm text-gray-text">
        {error || "Données indisponibles."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {data.linkedToCrm && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
          Échéancier synchronisé depuis votre fiche CRM.
        </p>
      )}

      <section className="rounded-2xl border border-gray/40 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div
            className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${data.paidPercent * 3.6}deg, var(--gray-light) 0deg)`,
            }}
          >
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
              <span className="text-2xl font-bold text-primary">{data.paidPercent} %</span>
              <span className="text-xs text-gray-text">Payé</span>
            </div>
          </div>
          <dl className="grid flex-1 gap-3 text-sm sm:grid-cols-1">
            <div className="flex justify-between border-b border-gray/30 pb-2">
              <dt className="text-gray-text">Montant total</dt>
              <dd className="font-bold">{formatFcfaShort(data.totalAmount)} FCFA</dd>
            </div>
            <div className="flex justify-between border-b border-gray/30 pb-2">
              <dt className="text-gray-text">Montant payé</dt>
              <dd className="font-bold text-emerald-600">
                {formatFcfaShort(data.paidAmount)} FCFA
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-text">Reste à payer</dt>
              <dd className="font-bold">{formatFcfaShort(data.remaining)} FCFA</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-gray/40 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-foreground">Échéancier</h3>
        <ul className="mt-4 divide-y divide-gray/30">
          {data.schedule.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
              <div>
                <p className="font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-gray-text">{item.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatFcfaShort(item.amount)} FCFA
                </p>
                <span className={`text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                  {PAYMENT_STATUS_LABELS[item.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
