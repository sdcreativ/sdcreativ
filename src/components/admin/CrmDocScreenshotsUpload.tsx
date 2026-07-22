"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { uploadCrmDocImageApi } from "@/lib/crm-docs-api";
import { resolveCrmDocScreenshotSrc } from "@/lib/crm-docs-screenshot-url";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
};

export function CrmDocScreenshotsUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        const { url } = await uploadCrmDocImageApi(file);
        uploaded.push(url);
      }
      onChange([...value, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {value.map((shot, index) => {
            const src = resolveImageDisplayUrl(resolveCrmDocScreenshotSrc(shot));
            return (
              <li
                key={`${shot}-${index}`}
                className="relative overflow-hidden rounded-xl border border-gray/40 bg-gray-light/40"
              >
                <div className="relative aspect-[16/10]">
                  <Image
                    src={src}
                    alt=""
                    fill
                    unoptimized={isProxiedMediaUrl(src) || src.startsWith("http")}
                    className="object-cover object-top"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                  <code className="truncate text-[10px] text-gray-text">{shot}</code>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="rounded-md p-1.5 text-red-600 hover:bg-white"
                    title="Retirer"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray/60 bg-gray-light/40 px-4 py-8 text-sm text-gray-text transition-colors hover:border-primary/40 hover:bg-primary-light/15 disabled:opacity-60",
        )}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        ) : (
          <ImagePlus className="h-5 w-5 text-primary" aria-hidden />
        )}
        {uploading ? "Envoi…" : "Uploader des captures"}
        <span className="text-[11px] text-gray-text/80">
          JPEG, PNG, WebP · max 5 Mo · stocké sur S3 (crm-docs/media/)
        </span>
      </button>

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
        Ajouter
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        title="Uploader des captures"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
