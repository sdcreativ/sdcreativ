"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { uploadSiteMediaApi } from "@/lib/site-media-api";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Champ requis pour la validation HTML5 du formulaire parent. */
  required?: boolean;
  /** Aspect de l’aperçu. */
  preview?: "wide" | "square" | "logo";
  /** Autoriser le vidage du champ. */
  clearable?: boolean;
  className?: string;
  label?: string;
};

export function SiteImageUploadField({
  value,
  onChange,
  required = false,
  preview = "wide",
  clearable = true,
  className,
  label = "Uploader une image",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function clearLocalPreview() {
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    clearLocalPreview();
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    try {
      const { url } = await uploadSiteMediaApi(file);
      onChange(url);
      clearLocalPreview();
    } catch (err) {
      clearLocalPreview();
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  const displaySrc =
    localPreview ?? (value.trim() ? resolveImageDisplayUrl(value.trim()) : "");
  const showPreview = Boolean(displaySrc);

  const previewAspect =
    preview === "square"
      ? "aspect-square max-w-48"
      : preview === "logo"
        ? "h-16 max-w-56"
        : "aspect-[16/9] max-w-md";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Valeur stockée (URL S3 ou chemin local) pour validation formulaire */}
      <input type="hidden" value={value} required={required} readOnly aria-hidden />

      {showPreview ? (
        <div className="overflow-hidden rounded-xl border border-gray/40 bg-gray-light/40">
          <div className={cn("relative mx-auto w-full overflow-hidden bg-gray-light", previewAspect)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displaySrc}
              alt="Aperçu"
              className={cn(
                "h-full w-full",
                preview === "logo" ? "object-contain p-2" : "object-cover",
              )}
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-gray/30 bg-white px-3 py-2.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-light disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
              Remplacer
            </button>
            {clearable ? (
              <button
                type="button"
                onClick={() => {
                  clearLocalPreview();
                  onChange("");
                }}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Retirer
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray/60 bg-gray-light/30 px-4 py-8 text-sm text-gray-text transition-colors hover:border-primary/40 hover:bg-primary/5",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          ) : (
            <ImagePlus className="h-6 w-6 text-primary" aria-hidden />
          )}
          <span>{uploading ? "Envoi en cours…" : label}</span>
          <span className="text-xs text-gray-text/80">JPEG, PNG, WebP, GIF — max 5 Mo</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
