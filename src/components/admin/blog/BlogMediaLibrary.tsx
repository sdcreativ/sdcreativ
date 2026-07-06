"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { fetchBlogMediaApi } from "@/lib/blog-posts-api";
import type { BlogMediaRecord } from "@/lib/blog-media-library";
import { cn } from "@/lib/utils";
import { Images, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
};

export function BlogMediaLibrary({ open, onClose, onSelect, title = "Bibliothèque médias" }: Props) {
  const [media, setMedia] = useState<BlogMediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await fetchBlogMediaApi();
      setMedia(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray/60 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-gray/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <Images className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              Chargement…
            </p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : media.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-text">
              Aucun média. Uploadez une image pour la retrouver ici.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {media.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className={cn(
                    "group overflow-hidden rounded-xl border border-gray/50 bg-gray-light text-left",
                    "hover:border-primary/40 hover:ring-2 hover:ring-primary/20",
                  )}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={item.url}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] text-gray-text">{item.filename}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
