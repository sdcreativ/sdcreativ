"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Layers, Plus, Trash2 } from "lucide-react";
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_UNIT_LABELS,
} from "@/content/service-catalog-labels";
import { formatQuoteAmount } from "@/content/quotes-labels";
import type { ServiceCatalogItem } from "@/lib/service-catalog";
import { fetchServiceCatalogItems } from "@/lib/service-catalog-api";
import {
  composerLineAmount,
  composerLineFromCatalogItem,
  composerLinesSubtotal,
  composerLinesToQuoteLines,
  createComposerLine,
  templateLinesToComposer,
  type QuoteComposerLine,
} from "@/lib/quote-composer";
import { fetchQuoteTemplate, fetchQuoteTemplates } from "@/lib/quote-templates-api";
import type { QuoteTemplate } from "@/lib/quote-templates";
import { CrmQuoteTemplatesPanel } from "@/components/admin/CrmQuoteTemplatesPanel";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  lines: QuoteComposerLine[];
  onChange: (lines: QuoteComposerLine[]) => void;
};

export function QuoteComposerFields({ lines, onChange }: Props) {
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [showPacks, setShowPacks] = useState(false);

  useEffect(() => {
    void fetchServiceCatalogItems(true)
      .then(setCatalog)
      .catch(() => setCatalogError("Catalogue indisponible."))
      .finally(() => setCatalogLoading(false));
    void fetchQuoteTemplates(true)
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    });
  }, [catalog, categoryFilter, search]);

  const categories = useMemo(
    () => [...new Set(catalog.map((item) => item.category))],
    [catalog],
  );

  const subtotal = composerLinesSubtotal(lines);

  function addCatalogItem(item: ServiceCatalogItem) {
    onChange([...lines, composerLineFromCatalogItem(item)]);
  }

  function addCustomLine() {
    onChange([...lines, createComposerLine()]);
  }

  function updateLine(id: string, patch: Partial<QuoteComposerLine>) {
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    onChange(lines.filter((line) => line.id !== id));
  }

  async function applyTemplate(template: QuoteTemplate) {
    const full = template.lines?.length ? template : await fetchQuoteTemplate(template.id);
    const composed = templateLinesToComposer(full.lines ?? []);
    onChange([...lines, ...composed]);
    setShowPacks(false);
  }

  return (
    <div className="space-y-4">
      {templates.length > 0 && (
        <div className="rounded-2xl border border-primary/20 bg-primary-light/15 p-4">
          <button
            type="button"
            onClick={() => setShowPacks((v) => !v)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <Layers className="h-4 w-4" aria-hidden />
            {showPacks ? "Masquer les packs" : "Appliquer un pack de devis"}
          </button>
          {showPacks && (
            <div className="mt-3">
              <CrmQuoteTemplatesPanel compact onApply={(t) => void applyTemplate(t)} />
            </div>
          )}
        </div>
      )}
      <div className="rounded-2xl border border-gray/40 bg-gray-light/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Ajouter depuis le catalogue</h3>
          <Link href="/admin/crm/catalogue" className="text-xs font-semibold text-primary hover:underline">
            Gérer le catalogue
          </Link>
        </div>

        {catalogLoading ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-gray-text">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Chargement…
          </p>
        ) : catalog.length === 0 ? (
          <p className="mt-3 text-sm text-gray-text">
            Catalogue vide.{" "}
            <Link href="/admin/crm/catalogue" className="font-semibold text-primary hover:underline">
              Ajoutez vos prestations
            </Link>{" "}
            ou importez depuis le configurateur public.
          </p>
        ) : (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une prestation…"
                className={fieldClass}
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={fieldClass}
              >
                <option value="all">Toutes catégories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {SERVICE_CATALOG_CATEGORY_LABELS[category as keyof typeof SERVICE_CATALOG_CATEGORY_LABELS]}
                  </option>
                ))}
              </select>
            </div>
            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {filteredCatalog.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => addCatalogItem(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray/30 bg-white px-3 py-2 text-left text-sm hover:border-primary/30 hover:bg-primary-light/20"
                  >
                    <span>
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-gray-text">
                        {formatQuoteAmount(item.unitPrice)} / {SERVICE_CATALOG_UNIT_LABELS[item.unit]}
                      </span>
                    </span>
                    <Plus className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {catalogError && <p className="mt-2 text-xs text-accent">{catalogError}</p>}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">Lignes du devis</h3>
          <button
            type="button"
            onClick={addCustomLine}
            className="text-xs font-semibold text-primary hover:underline"
          >
            + Ligne libre
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray/50 px-4 py-6 text-center text-sm text-gray-text">
            Ajoutez des prestations depuis le catalogue ou une ligne libre.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="rounded-xl border border-gray/30 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_80px_120px_auto_auto] sm:items-end">
                  <label className="block text-xs text-gray-text">
                    Libellé
                    <input
                      value={line.label}
                      onChange={(e) => updateLine(line.id, { label: e.target.value })}
                      required
                      className={cn(fieldClass, "mt-1")}
                    />
                  </label>
                  <label className="block text-xs text-gray-text">
                    Qté
                    <input
                      type="number"
                      min={0.01}
                      step={1}
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                      className={cn(fieldClass, "mt-1")}
                    />
                  </label>
                  <label className="block text-xs text-gray-text">
                    Prix unit. HT
                    <input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                      className={cn(fieldClass, "mt-1")}
                    />
                  </label>
                  <p className="text-sm font-semibold text-foreground sm:pb-2.5">
                    {formatQuoteAmount(composerLineAmount(line))}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="rounded-lg border border-accent/30 p-2 text-accent hover:bg-accent/5 sm:mb-0.5"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary-light/30 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-text">Total HT</p>
        <p className="text-2xl font-bold text-primary">{formatQuoteAmount(subtotal)}</p>
      </div>
    </div>
  );
}

export function getQuoteLinesFromComposer(lines: QuoteComposerLine[]) {
  return composerLinesToQuoteLines(lines);
}

export function getComposerSubtotal(lines: QuoteComposerLine[]) {
  return composerLinesSubtotal(lines);
}
