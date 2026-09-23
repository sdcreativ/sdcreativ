"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

type Props = {
  token: string;
  name: string;
  url: string;
};

export function BusinessCardActions({ token, name, url }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/cards/${encodeURIComponent(token)}/view`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [token]);

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, text: `${name} — SD CREATIV`, url });
        return;
      } catch {
        // Annulation ou partage indisponible : on copie le lien.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-gray/40 bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary-light"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
      {copied ? "Lien copié" : "Partager ma carte"}
    </button>
  );
}
