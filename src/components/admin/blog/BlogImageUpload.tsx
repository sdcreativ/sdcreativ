"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Images, Loader2, Trash2, Upload } from "lucide-react";
import { uploadBlogImageApi } from "@/lib/blog-posts-api";
import { BlogMediaLibrary } from "@/components/admin/blog/BlogMediaLibrary";
import { resolveImageDisplayUrl, isProxiedMediaUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
};

export function BlogImageUpload({ value, onChange, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const { url } = await uploadBlogImageApi(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  const displaySrc = value ? resolveImageDisplayUrl(value) : "";

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-gray/60 bg-gray-light">
          <div className={cn("relative", compact ? "aspect-[16/10]" : "aspect-[2/1]")}>
            <Image
              src={displaySrc}
              alt=""
              fill
              unoptimized={isProxiedMediaUrl(displaySrc) || displaySrc.startsWith("http")}
              className="object-cover"
            />
          </div>
          <div className="absolute right-1.5 top-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-md bg-white/95 p-1.5 text-foreground shadow hover:bg-white"
              title="Remplacer"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-3.5 w-3.5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-md bg-white/95 p-1.5 text-red-600 shadow hover:bg-white"
              title="Retirer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray/60 bg-gray-light/40 text-xs text-gray-text transition-colors hover:border-primary/40 hover:bg-primary-light/15",
            compact ? "px-3 py-6" : "px-4 py-10 text-sm",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          ) : (
            <ImagePlus className="h-5 w-5 text-primary" aria-hidden />
          )}
          {uploading ? "Envoi…" : "Uploader une image"}
          <span className="text-[11px] text-gray-text/80">JPEG, PNG, WebP · max 5 Mo</span>
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs font-medium text-foreground hover:bg-gray-light disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          Uploader
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray/60 bg-white px-3 py-2 text-xs font-medium text-primary hover:bg-primary-light/30"
        >
          <Images className="h-3.5 w-3.5" aria-hidden />
          Bibliothèque
        </button>
      </div>

      <input
        title="Uploader une image"
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <BlogMediaLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={onChange}
        title="Choisir une image de couverture"
      />
    </div>
  );
}
