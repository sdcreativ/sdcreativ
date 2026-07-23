"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { SiteQuoteConfigSettings } from "@/lib/site-quote-config-types";
import { parseFetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useDialog } from "@/components/ui/DialogProvider";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

async function fetchQuoteConfigAdmin(): Promise<SiteQuoteConfigSettings> {
  const res = await fetch("/api/admin/site-quote-config", { credentials: "include" });
  const json = await parseFetchJson<{ config: SiteQuoteConfigSettings }>(res);
  return json.config;
}

async function saveQuoteConfigAdmin(config: SiteQuoteConfigSettings): Promise<SiteQuoteConfigSettings> {
  const res = await fetch("/api/admin/site-quote-config", {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  const json = await parseFetchJson<{ config: SiteQuoteConfigSettings }>(res);
  return json.config;
}

async function resetQuoteConfigAdmin(): Promise<SiteQuoteConfigSettings> {
  const res = await fetch("/api/admin/site-quote-config/reset", {
    method: "POST",
    credentials: "include",
  });
  const json = await parseFetchJson<{ config: SiteQuoteConfigSettings }>(res);
  return json.config;
}

function slugifyId(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Prix optionnel : champ vide → 0. */
function parseOptionalPrice(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function priceInputValue(amount: number): string | number {
  return amount > 0 ? amount : "";
}

export function CrmQuoteConfigView() {
  const { confirm } = useDialog();
  const [form, setForm] = useState<SiteQuoteConfigSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(await fetchQuoteConfigAdmin());
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const updated = await saveQuoteConfigAdmin(form);
      setForm(updated);
      setMessage("Configurateur enregistré — /devis sera mis à jour sous quelques secondes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Réinitialiser le configurateur ?",
      message: "Les valeurs par défaut du code seront restaurées.",
      confirmLabel: "Réinitialiser",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    setMessage("");
    try {
      setForm(await resetQuoteConfigAdmin());
      setMessage("Configurateur réinitialisé.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Réinitialisation impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Calculator className="h-5 w-5 text-primary" aria-hidden />
            Configurateur de devis
          </h2>
          <p className="mt-1 text-sm text-gray-text">
            Types de projet, paliers de pages, options et textes de la section « Configurez votre projet » sur /devis.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-gray/60 bg-white px-4 py-2 text-sm font-medium text-gray-text hover:bg-gray-light"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 bg-white px-4 py-2 text-sm font-medium text-gray-text hover:bg-gray-light disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Réinitialiser
          </button>
        </div>
      </div>

      {message && (
        <p
          className={cn(
            "mb-4 rounded-xl px-4 py-3 text-sm",
            message.includes("impossible") || message.includes("Erreur")
              ? "bg-accent/10 text-accent-dark"
              : "bg-primary/10 text-primary",
          )}
        >
          {message}
        </p>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
        <section className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-foreground">Textes du formulaire</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Titre</span>
              <input
                required
                value={form.formTitle}
                onChange={(e) => setForm((p) => ({ ...p!, formTitle: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Sous-titre</span>
              <input
                required
                value={form.formSubtitle}
                onChange={(e) => setForm((p) => ({ ...p!, formSubtitle: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-text">Note d&apos;estimation (encart latéral)</span>
              <textarea
                required
                rows={2}
                value={form.estimateNote}
                onChange={(e) => setForm((p) => ({ ...p!, estimateNote: e.target.value }))}
                className={fieldClass}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Types de projet</h3>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p!,
                  projectTypes: [
                    ...p!.projectTypes,
                    {
                      id: `projet-${p!.projectTypes.length + 1}`,
                      label: "Nouveau type",
                      basePrice: 0,
                      supportsPages: true,
                      defaultPages: 5,
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {form.projectTypes.map((type, index) => (
              <div key={`${type.id}-${index}`} className="grid gap-3 rounded-xl border border-gray/50 p-4 md:grid-cols-6">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-gray-text">Libellé</span>
                  <input
                    required
                    value={type.label}
                    onChange={(e) =>
                      setForm((p) => {
                        const projectTypes = [...p!.projectTypes];
                        projectTypes[index] = { ...projectTypes[index]!, label: e.target.value };
                        return { ...p!, projectTypes };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">Identifiant</span>
                  <input
                    required
                    value={type.id}
                    onChange={(e) =>
                      setForm((p) => {
                        const projectTypes = [...p!.projectTypes];
                        projectTypes[index] = { ...projectTypes[index]!, id: e.target.value };
                        return { ...p!, projectTypes };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">
                    Prix base (FCFA, optionnel — vide = devis)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={priceInputValue(type.basePrice)}
                    onChange={(e) =>
                      setForm((p) => {
                        const projectTypes = [...p!.projectTypes];
                        projectTypes[index] = {
                          ...projectTypes[index]!,
                          basePrice: parseOptionalPrice(e.target.value),
                        };
                        return { ...p!, projectTypes };
                      })
                    }
                    placeholder="Sur devis"
                    className={fieldClass}
                  />
                </label>
                <label className="flex items-end gap-2 pb-2.5">
                  <input
                    type="checkbox"
                    checked={type.supportsPages}
                    onChange={(e) =>
                      setForm((p) => {
                        const projectTypes = [...p!.projectTypes];
                        projectTypes[index] = { ...projectTypes[index]!, supportsPages: e.target.checked };
                        return { ...p!, projectTypes };
                      })
                    }
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-text">Pages</span>
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    disabled={form.projectTypes.length <= 1}
                    onClick={() =>
                      setForm((p) => ({
                        ...p!,
                        projectTypes: p!.projectTypes.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg p-2 text-gray-text hover:bg-accent/10 hover:text-accent disabled:opacity-30"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Paliers de pages</h3>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p!,
                  pageTiers: [
                    ...p!.pageTiers,
                    {
                      id: slugifyId(`palier ${p!.pageTiers.length + 1}`) || `palier-${p!.pageTiers.length + 1}`,
                      label: "Nouveau palier",
                      minPages: 1,
                      maxPages: 5,
                      extraPrice: 0,
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {form.pageTiers.map((tier, index) => (
              <div key={`${tier.id}-${index}`} className="grid gap-3 rounded-xl border border-gray/50 p-4 md:grid-cols-5">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-gray-text">Libellé</span>
                  <input
                    required
                    value={tier.label}
                    onChange={(e) =>
                      setForm((p) => {
                        const pageTiers = [...p!.pageTiers];
                        pageTiers[index] = { ...pageTiers[index]!, label: e.target.value };
                        return { ...p!, pageTiers };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">Identifiant</span>
                  <input
                    required
                    value={tier.id}
                    onChange={(e) =>
                      setForm((p) => {
                        const pageTiers = [...p!.pageTiers];
                        pageTiers[index] = { ...pageTiers[index]!, id: e.target.value };
                        return { ...p!, pageTiers };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">
                    Supplément (FCFA, optionnel — vide = 0)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={priceInputValue(tier.extraPrice)}
                    onChange={(e) =>
                      setForm((p) => {
                        const pageTiers = [...p!.pageTiers];
                        pageTiers[index] = {
                          ...pageTiers[index]!,
                          extraPrice: parseOptionalPrice(e.target.value),
                        };
                        return { ...p!, pageTiers };
                      })
                    }
                    placeholder="0"
                    className={fieldClass}
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    disabled={form.pageTiers.length <= 1}
                    onClick={() =>
                      setForm((p) => ({
                        ...p!,
                        pageTiers: p!.pageTiers.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg p-2 text-gray-text hover:bg-accent/10 hover:text-accent disabled:opacity-30"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Options supplémentaires</h3>
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p!,
                  addons: [
                    ...p!.addons,
                    {
                      id: slugifyId(`option ${p!.addons.length + 1}`) || `option-${p!.addons.length + 1}`,
                      label: "Nouvelle option",
                      price: 0,
                    },
                  ],
                }))
              }
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Ajouter
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {form.addons.map((addon, index) => (
              <div key={`${addon.id}-${index}`} className="grid gap-3 rounded-xl border border-gray/50 p-4 md:grid-cols-6">
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-gray-text">Libellé</span>
                  <input
                    required
                    value={addon.label}
                    onChange={(e) =>
                      setForm((p) => {
                        const addons = [...p!.addons];
                        addons[index] = { ...addons[index]!, label: e.target.value };
                        return { ...p!, addons };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">Identifiant</span>
                  <input
                    required
                    value={addon.id}
                    onChange={(e) =>
                      setForm((p) => {
                        const addons = [...p!.addons];
                        addons[index] = { ...addons[index]!, id: e.target.value };
                        return { ...p!, addons };
                      })
                    }
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-gray-text">
                    Prix (FCFA, optionnel — vide = devis)
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={priceInputValue(addon.price)}
                    onChange={(e) =>
                      setForm((p) => {
                        const addons = [...p!.addons];
                        addons[index] = {
                          ...addons[index]!,
                          price: parseOptionalPrice(e.target.value),
                        };
                        return { ...p!, addons };
                      })
                    }
                    placeholder="Sur devis"
                    className={fieldClass}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-gray-text">Types de projet (ids, virgules — vide = tous)</span>
                  <input
                    value={addon.forProjects?.join(", ") ?? ""}
                    onChange={(e) =>
                      setForm((p) => {
                        const addons = [...p!.addons];
                        const raw = e.target.value.trim();
                        addons[index] = {
                          ...addons[index]!,
                          forProjects: raw
                            ? raw.split(",").map((s) => s.trim()).filter(Boolean)
                            : undefined,
                        };
                        return { ...p!, addons };
                      })
                    }
                    className={fieldClass}
                    placeholder="e-commerce, site-vitrine"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((p) => ({
                        ...p!,
                        addons: p!.addons.filter((_, i) => i !== index),
                      }))
                    }
                    className="rounded-lg p-2 text-gray-text hover:bg-accent/10 hover:text-accent"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
