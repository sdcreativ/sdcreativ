"use client";

import { useEffect, useState } from "react";
import { getAccountingExportUrl } from "@/lib/operations-api";
import { Download } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Entity = { id: string; name: string; slug: string };

export function CrmAccountingExportPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);

  useEffect(() => {
    void fetch("/api/admin/legal-entities", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { entities?: Entity[] }) => setEntities(json.entities ?? []))
      .catch(() => setEntities([]));
  }, []);

  const filters = {
    from: from || undefined,
    to: to || undefined,
    legalEntityId: legalEntityId || undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Export comptable</h2>
        <p className="text-sm text-gray-text">
          CSV métier, FEC (écritures SYSCOHADA) et CSV CI enrichi (devise, taux XOF, entité).
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Du</span>
            <input type="date" className={fieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Au</span>
            <input type="date" className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Entité légale</span>
            <select
              className={fieldClass}
              value={legalEntityId}
              onChange={(e) => setLegalEntityId(e.target.value)}
            >
              <option value="">Toutes</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={getAccountingExportUrl({ ...filters, format: "csv" })}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV métier
          </a>
          <a
            href={getAccountingExportUrl({ ...filters, format: "ci-csv" })}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/30"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV CI (XOF)
          </a>
          <a
            href={getAccountingExportUrl({ ...filters, format: "fec" })}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/40 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-gray-light"
          >
            <Download className="h-4 w-4" aria-hidden />
            FEC / écritures
          </a>
        </div>
      </div>
    </div>
  );
}
