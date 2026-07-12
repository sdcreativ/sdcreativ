"use client";

import { useState } from "react";
import { getAccountingExportUrl } from "@/lib/operations-api";
import { Download } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function CrmAccountingExportPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const exportUrl = getAccountingExportUrl({ from: from || undefined, to: to || undefined });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Export comptable</h2>
        <p className="text-sm text-gray-text">
          CSV factures et paiements — période, TVA, client, mode de paiement.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Du</span>
            <input type="date" className={fieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Au</span>
            <input type="date" className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        <a
          href={exportUrl}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          <Download className="h-4 w-4" aria-hidden />
          Télécharger CSV
        </a>
      </div>
    </div>
  );
}
