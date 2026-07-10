"use client";

import { Mail } from "lucide-react";

export function ReportsSchedulePanel() {
  return (
    <div className="rounded-2xl border border-gray/30 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700">
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Rapports planifiés par email</p>
          <p className="mt-0.5 text-sm text-gray-text">
            Un résumé hebdomadaire est envoyé automatiquement à l&apos;équipe : KPIs, comparaison
            N-1, tendances sur 12 mois et lien vers le PDF.
          </p>
        </div>
      </div>
    </div>
  );
}
