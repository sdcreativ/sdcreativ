"use client";

import { Mail } from "lucide-react";

export function ReportsSchedulePanel() {
  const cronPath = "/api/cron/scheduled-reports";
  const recipients = process.env.NEXT_PUBLIC_REPORT_CRON_RECIPIENTS ?? "REPORT_CRON_RECIPIENTS (VPS)";

  return (
    <div className="rounded-2xl border border-gray/30 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Rapports planifiés par email</p>
          <p className="mt-0.5 text-sm text-gray-text">
            Cron VPS hebdomadaire : KPIs, comparaison N-1, CSV tendance 12 mois et lien vers le PDF.
            Configurez <code className="rounded bg-gray-light px-1">REPORT_CRON_RECIPIENTS</code> et{" "}
            <code className="rounded bg-gray-light px-1">CRON_SECRET</code> sur le serveur.
          </p>
          <p className="mt-2 text-xs text-gray-text">
            Route : <code className="rounded bg-gray-light px-1">{cronPath}</code>
          </p>
          <p className="mt-1 text-xs text-gray-text">
            Exemple crontab :{" "}
            <code className="rounded bg-gray-light px-1 text-[10px]">
              0 8 * * 1 curl -s -H &quot;Authorization: Bearer CRON_SECRET&quot; …{cronPath}
            </code>
          </p>
          <p className="mt-2 text-xs text-gray-text">
            Destinataires : {recipients}
          </p>
        </div>
      </div>
    </div>
  );
}
