"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Move, Trash2, Upload } from "lucide-react";
import {
  DEFAULT_IMAGE_POSITION,
  formatImagePosition,
  parseImagePosition,
} from "@/lib/image-position";
import { resolveImageDisplayUrl } from "@/lib/image-url";
import { uploadTeamMemberImageApi } from "@/lib/public-team-api";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  value: string;
  imagePosition: string;
  onChange: (url: string) => void;
  onPositionChange: (position: string) => void;
};

export function TeamMemberImageField({
  value,
  imagePosition,
  onChange,
  onPositionChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const focalRef = useRef(parseImagePosition(imagePosition));
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [focal, setFocal] = useState(() => parseImagePosition(imagePosition));
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const parsed = parseImagePosition(imagePosition);
    focalRef.current = parsed;
    setFocal(parsed);
  }, [imagePosition]);

  useEffect(() => {
    setLoadError(false);
  }, [value]);

  useEffect(() => {
    if (!localPreview || !value) return;

    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) {
        clearLocalPreview();
        setLoadError(false);
      }
    };
    probe.onerror = () => {
      if (!cancelled) setLoadError(true);
    };
    probe.src = resolveImageDisplayUrl(value);

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
    };
  }, [localPreview, value]);

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
    setLoadError(false);
    clearLocalPreview();
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    try {
      const { url } = await uploadTeamMemberImageApi(file);
      onChange(url);
      onPositionChange(DEFAULT_IMAGE_POSITION);
      const reset = parseImagePosition(DEFAULT_IMAGE_POSITION);
      focalRef.current = reset;
      setFocal(reset);
    } catch (err) {
      clearLocalPreview();
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  function commitPosition(next: { x: number; y: number }) {
    focalRef.current = next;
    setFocal(next);
    onPositionChange(formatImagePosition(next.x, next.y));
  }

  const objectPosition = formatImagePosition(focal.x, focal.y);
  const displaySrc = localPreview ?? (value ? resolveImageDisplayUrl(value) : "");
  const showPreview = Boolean(displaySrc);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!displaySrc) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;

    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    const size = frameRef.current?.offsetWidth ?? 112;
    const sensitivity = 100 / size;

    const next = {
      x: focalRef.current.x - dx * sensitivity,
      y: focalRef.current.y - dy * sensitivity,
    };
    commitPosition({
      x: Math.min(100, Math.max(0, next.x)),
      y: Math.min(100, Math.max(0, next.y)),
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function handlePreviewLoad() {
    setLoadError(false);
  }

  function handlePreviewError() {
    if (localPreview) return;
    setLoadError(true);
  }

  return (
    <div className="space-y-2">
      {showPreview ? (
        <div className="space-y-2">
          <div
            ref={frameRef}
            className={cn(
              "relative mx-auto h-28 w-28 touch-none overflow-hidden rounded-full ring-4 ring-primary-light select-none",
              isDragging ? "cursor-grabbing ring-primary/40" : "cursor-grab",
              loadError && !localPreview && "ring-red-200",
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="Glissez la photo pour ajuster le cadrage"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={displaySrc}
              src={displaySrc}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition }}
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
            {!isDragging && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/45 to-transparent pb-1.5 pt-6 opacity-0 transition-opacity hover:opacity-100">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-foreground">
                  <Move className="h-3 w-3" aria-hidden />
                  Déplacer
                </span>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-gray-text">
            Glissez la photo dans le cercle pour recadrer le portrait.
          </p>

          <div className="flex justify-center gap-2">
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
                onChange("");
                onPositionChange(DEFAULT_IMAGE_POSITION);
                setLoadError(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mx-auto flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-full border border-dashed border-gray/60 bg-gray-light/40 text-xs text-gray-text hover:border-primary/40"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          ) : (
            <ImagePlus className="h-5 w-5 text-primary" aria-hidden />
          )}
          Photo
        </button>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
        placeholder="URL de la photo"
        aria-label="URL de la photo"
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-label="Uploader une photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      {loadError && !localPreview && (
        <p className="text-center text-xs text-red-600">
          L&apos;aperçu ne charge pas — le fichier n&apos;est peut-être pas encore accessible sur le
          serveur. Réessayez l&apos;upload puis enregistrez.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
