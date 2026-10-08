"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

/** Confirmation explicite : un simple clic dans l'e-mail (ou un antivirus) ne désinscrit pas tout seul. */
export function UnsubscribePanel({ token, maskedEmail }: { token: string; maskedEmail: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function confirm() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Désinscription impossible.");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Désinscription impossible.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>
          C’est fait : <strong>{maskedEmail}</strong> ne recevra plus nos offres ni nos relances. Les e-mails liés à
          un devis ou une facture en cours continuent.
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-text">
        Ne plus recevoir les offres, relances et actualités de SD CREATIV à l’adresse <strong>{maskedEmail}</strong> ?
      </p>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={state === "busy"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {state === "busy" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Me désinscrire
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
