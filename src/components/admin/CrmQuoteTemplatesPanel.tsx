"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, Plus, Trash2 } from "lucide-react";
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CATEGORIES,
  type ServiceCatalogCategory,
} from "@/content/service-catalog-labels";
import { formatQuoteAmount } from "@/content/quotes-labels";
import type { QuoteTemplate } from "@/lib/quote-templates";
import {
  createQuoteTemplateApi,
  deleteQuoteTemplateApi,
  fetchQuoteTemplates,
} from "@/lib/quote-templates-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  onApply?: (template: QuoteTemplate) => void;
  compact?: boolean;
};

export function CrmQuoteTemplatesPanel({ onApply, compact }: Props) {
  const { confirm } = useDialog();
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTemplates(await fetchQuoteTemplates(!compact));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, [compact]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(template: QuoteTemplate) {
    const ok = await confirm({
      title: "Supprimer le pack",
      message: `Supprimer « ${template.name} » ?`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    await deleteQuoteTemplateApi(template.id);
    await load();
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        Chargement des packs…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-accent">{error}</p>;
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {!compact && (
        <p className="text-sm text-gray-text">
          Packs pré-remplis pour composer un devis en un clic — site vitrine, e-commerce, maintenance…
        </p>
      )}

      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray/40 px-4 py-8 text-center text-sm text-gray-text">
          Aucun pack configuré.
        </p>
      ) : (
        <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
          {templates.map((template) => (
            <article
              key={template.id}
              className="overflow-hidden rounded-2xl border border-gray/25 bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className="border-b border-gray/15 bg-gradient-to-r from-primary-light/20 to-white px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" aria-hidden />
                    <p className="font-bold text-foreground">{template.name}</p>
                  </div>
                  {!template.isActive && (
                    <span className="rounded-full bg-gray-light px-2 py-0.5 text-[10px] font-bold uppercase text-gray-text">
                      Inactif
                    </span>
                  )}
                </div>
                {template.description && (
                  <p className="mt-1 text-xs leading-relaxed text-gray-text">{template.description}</p>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-text">
                  {template.lineCount} ligne(s) · {formatQuoteAmount(template.totalAmount)} HT
                </p>
                <p className="mt-1 text-[11px] text-gray-text">
                  {SERVICE_CATALOG_CATEGORY_LABELS[template.category]}
                </p>
                <div className="mt-3 flex gap-2">
                  {onApply && (
                    <button
                      type="button"
                      onClick={() => onApply(template)}
                      className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
                    >
                      Appliquer
                    </button>
                  )}
                  {!compact && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(template)}
                      className="rounded-xl border border-accent/20 px-3 py-2 text-accent hover:bg-accent/5"
                      aria-label={`Supprimer ${template.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!compact && (
        <CreateTemplateButton onCreated={load} />
      )}
    </div>
  );
}

function CreateTemplateButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ServiceCatalogCategory>("autre");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createQuoteTemplateApi({
        name,
        description: description || null,
        category,
        lines: [{ label: "Prestation à définir", quantity: 1, unitPrice: 0 }],
      });
      setOpen(false);
      setName("");
      setDescription("");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary-light/20 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light/40"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Nouveau pack
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="rounded-2xl border border-primary/20 bg-primary-light/10 p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Nouveau pack de devis</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nom du pack *" className={fieldClass} />
        <select value={category} onChange={(e) => setCategory(e.target.value as ServiceCatalogCategory)} className={fieldClass}>
          {SERVICE_CATALOG_CATEGORIES.map((c) => (
            <option key={c} value={c}>{SERVICE_CATALOG_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={cn(fieldClass, "sm:col-span-2")} />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray/50 px-4 py-2 text-sm text-gray-text">
          Annuler
        </button>
      </div>
    </form>
  );
}
