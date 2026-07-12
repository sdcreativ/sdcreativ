"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CrmInvoicesView } from "@/components/admin/CrmInvoicesView";
import { CrmCreditNotesPanel } from "@/components/admin/CrmCreditNotesPanel";
import { CrmContractsPanel } from "@/components/admin/CrmContractsPanel";
import { CrmSubscriptionsPanel } from "@/components/admin/CrmSubscriptionsPanel";
import { CrmAccountingExportPanel } from "@/components/admin/CrmAccountingExportPanel";
import { cn } from "@/lib/utils";
import { Download, FileSignature, Receipt, RefreshCw, Repeat } from "lucide-react";

const TABS = [
  { id: "factures", label: "Factures", icon: Receipt },
  { id: "avoirs", label: "Avoirs", icon: RefreshCw },
  { id: "abonnements", label: "Abonnements", icon: Repeat },
  { id: "contrats", label: "Contrats", icon: FileSignature },
  { id: "export", label: "Export comptable", icon: Download },
] as const;

type BillingTab = (typeof TABS)[number]["id"];

export function CrmBillingHubView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as BillingTab) ?? "factures";
  const [tab, setTab] = useState<BillingTab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "factures",
  );

  useEffect(() => {
    const urlTab = searchParams.get("tab") as BillingTab;
    if (urlTab && TABS.some((t) => t.id === urlTab)) setTab(urlTab);
  }, [searchParams]);

  const handleTab = useCallback((id: BillingTab) => {
    setTab(id);
    const url = new URL(window.location.href);
    if (id === "factures") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2" aria-label="Sections facturation">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTab(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
              tab === id
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-gray/60 bg-white text-gray-text hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {tab === "factures" && <CrmInvoicesView />}
      {tab === "avoirs" && <CrmCreditNotesPanel />}
      {tab === "abonnements" && <CrmSubscriptionsPanel />}
      {tab === "contrats" && <CrmContractsPanel />}
      {tab === "export" && <CrmAccountingExportPanel />}
    </div>
  );
}
