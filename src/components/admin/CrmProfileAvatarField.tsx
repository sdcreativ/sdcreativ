"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { CrmUserAvatar } from "@/components/admin/CrmUserAvatar";
import { notifyCrmSessionChanged } from "@/lib/crm-session-events";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl: string | null;
  onChange: (avatarUrl: string | null) => void;
};

export function CrmProfileAvatarField({ name, avatarUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/account/avatar", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = (await res.json()) as {
        error?: string;
        account?: { avatarUrl: string | null };
      };
      if (!res.ok) throw new Error(data.error ?? "Upload impossible.");
      onChange(data.account?.avatarUrl ?? null);
      notifyCrmSessionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Suppression impossible.");
      onChange(null);
      notifyCrmSessionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <CrmUserAvatar name={name} avatarUrl={avatarUrl} size="lg" className="ring-primary/20" />

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/40 bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-gray-light/40 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            Choisir une photo
          </button>
          {avatarUrl && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void removeAvatar()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray/40 px-4 py-2 text-sm font-medium text-gray-text hover:text-accent disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </button>
          )}
        </div>
        <p className="text-xs text-gray-text">JPEG, PNG, WebP ou GIF — max 2 Mo.</p>
        {error && <p className={cn("text-xs text-accent")}>{error}</p>}
      </div>
    </div>
  );
}
