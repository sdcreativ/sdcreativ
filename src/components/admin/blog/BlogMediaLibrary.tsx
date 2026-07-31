"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  deleteBlogMediaApi,
  fetchBlogMediaApi,
  uploadBlogImageApi,
} from "@/lib/blog-posts-api";
import type { BlogMediaItem } from "@/lib/blog-posts-api";
import { isProxiedMediaUrl, resolveImageDisplayUrl } from "@/lib/image-url";
import { useDialog } from "@/components/ui/DialogProvider";
import { cn } from "@/lib/utils";
import {
  ArrowDownWideNarrow,
  Check,
  Images,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

type SortKey = "newest" | "oldest" | "name" | "size";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
  /** URL déjà sélectionnée (couverture / OG) pour le feedback visuel. */
  currentUrl?: string;
};

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function BlogMediaLibrary({
  open,
  onClose,
  onSelect,
  title = "Bibliothèque médias",
  currentUrl = "",
}: Props) {
  const { confirm } = useDialog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<BlogMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await fetchBlogMediaApi(96);
      setMedia(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSort("newest");
    setError("");
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !media.length) {
      setSelectedId(null);
      return;
    }
    if (currentUrl) {
      const match = media.find((m) => m.url === currentUrl);
      setSelectedId(match?.id ?? null);
      return;
    }
    setSelectedId(null);
  }, [open, media, currentUrl]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? media.filter((m) => m.filename.toLowerCase().includes(q))
      : [...media];

    list.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "name":
          return a.filename.localeCompare(b.filename, "fr", { sensitivity: "base" });
        case "size":
          return (b.byteSize ?? 0) - (a.byteSize ?? 0);
        case "newest":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
    return list;
  }, [media, query, sort]);

  const selected = selectedId ? media.find((m) => m.id === selectedId) : null;

  async function handleUpload(file: File) {
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadBlogImageApi(file);
      const items = await fetchBlogMediaApi(96);
      setMedia(items);
      const created = items.find((m) => m.url === url);
      if (created) setSelectedId(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(item: BlogMediaItem) {
    const ok = await confirm({
      title: "Supprimer l'image",
      message: `Supprimer définitivement « ${item.filename} » de la bibliothèque et du stockage ? Les articles qui l’utilisent afficheront une image cassée.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingId(item.id);
    setError("");
    try {
      await deleteBlogMediaApi(item.id);
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      if (selectedId === item.id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  function applySelection() {
    if (!selected) return;
    onSelect(selected.url);
    onClose();
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-xl">
        <header className="flex items-center justify-between gap-3 border-b border-gray/40 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Images className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
            {!loading && media.length > 0 ? (
              <span className="shrink-0 rounded-md bg-gray-light px-1.5 py-0.5 text-[11px] text-gray-text">
                {filtered.length}
                {query.trim() ? ` / ${media.length}` : ""}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-text hover:bg-gray-light"
            aria-label="Fermer la bibliothèque"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-gray/40 px-4 py-3">
          <label className="relative min-w-[12rem] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-text"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom de fichier…"
              className="w-full rounded-lg border border-gray/60 bg-white py-2 pl-8 pr-3 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <label className="flex items-center gap-1.5 text-xs text-gray-text">
            <ArrowDownWideNarrow className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Trier</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-gray/60 bg-white px-2 py-2 text-xs text-foreground outline-none focus:border-primary/50"
            >
              <option value="newest">Plus récentes</option>
              <option value="oldest">Plus anciennes</option>
              <option value="name">Nom (A→Z)</option>
              <option value="size">Taille</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs font-medium text-foreground hover:bg-gray-light disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden />
            )}
            {uploading ? "Envoi…" : "Uploader"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            title="Uploader une image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : null}
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              Chargement…
            </p>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-sm text-gray-text">
                Aucun média. Uploadez une image pour commencer.
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Uploader une image
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-text">
              Aucun résultat pour « {query.trim()} ».
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((item) => {
                const displaySrc = resolveImageDisplayUrl(item.url);
                const isSelected = selectedId === item.id;
                const sizeLabel = formatBytes(item.byteSize);
                const dateLabel = formatDate(item.createdAt);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-gray-light text-left transition",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-gray/50 hover:border-primary/40 hover:ring-2 hover:ring-primary/15",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      onDoubleClick={() => {
                        onSelect(item.url);
                        onClose();
                      }}
                      className="block w-full text-left"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={displaySrc}
                          alt=""
                          fill
                          unoptimized={
                            isProxiedMediaUrl(displaySrc) || displaySrc.startsWith("http")
                          }
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        {isSelected ? (
                          <span className="absolute left-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
                            <Check className="h-3.5 w-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-0.5 px-2 py-1.5">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {item.filename}
                        </p>
                        <p className="truncate text-[10px] text-gray-text">
                          {[dateLabel, sizeLabel].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Supprimer"
                      aria-label={`Supprimer ${item.filename}`}
                      disabled={deletingId === item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item);
                      }}
                      className={cn(
                        "absolute right-1.5 top-1.5 rounded-md bg-white/95 p-1.5 text-red-600 shadow opacity-0 transition",
                        "hover:bg-white group-hover:opacity-100 focus:opacity-100",
                        "disabled:opacity-60",
                        isSelected && "opacity-100",
                      )}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray/40 px-4 py-3">
          <p className="text-[11px] text-gray-text">
            {selected
              ? `Sélection : ${selected.filename}`
              : "Cliquez pour sélectionner · double-clic pour utiliser"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs font-medium text-foreground hover:bg-gray-light"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={applySelection}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Utiliser cette image
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
