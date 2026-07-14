"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { LOGO } from "@/lib/constants";
import { uploadSiteLogoApi } from "@/lib/crm-settings-api";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function SiteLogoUploadField({ value, onChange }: Props) {
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
      const { url } = await uploadSiteLogoApi(file);
      onChange(url);
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

  return (
    <div className="space-y-3">
      {showPreview ? (
        <div className="flex items-center gap-4 rounded-xl border border-gray/30 bg-gray-light/30 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt="Aperçu du logo"
            className="h-14 max-w-[200px] object-contain"
          />
          <div className="flex flex-wrap gap-2">
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
            <button
              type="button"
              onClick={() => {
                clearLocalPreview();
                onChange(LOGO.src);
              }}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Logo par défaut
            </button>
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
          <span>{uploading ? "Envoi en cours…" : "Choisir un logo (JPEG, PNG, WebP, GIF, SVG — max 2 Mo)"}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.svg"
        className="sr-only"
        aria-label="Uploader le logo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
