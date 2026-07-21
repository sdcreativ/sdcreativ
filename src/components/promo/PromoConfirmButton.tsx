"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function PromoConfirmButton({
  token,
  trackClick = false,
}: {
  token: string;
  trackClick?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trackClick) return;
    void fetch(`/api/promo/${encodeURIComponent(token)}/click`, { method: "POST" }).catch(
      () => undefined,
    );
  }, [token, trackClick]);

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/promo/${encodeURIComponent(token)}/confirm`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Confirmation impossible.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation impossible.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
        Merci — votre intérêt est bien enregistré. Un conseiller vous recontacte rapidement.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={loading}
        onClick={() => void confirm()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Je suis intéressé(e)
      </button>
      {error ? <p className="text-center text-sm text-accent">{error}</p> : null}
    </div>
  );
}
