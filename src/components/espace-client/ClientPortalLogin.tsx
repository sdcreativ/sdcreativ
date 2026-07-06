"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientProfileData } from "@/lib/client-portal-config";

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

type Props = {
  onSuccess: (session: { clientId: string; profile: ClientProfileData }) => void;
  className?: string;
};

export function ClientPortalLogin({ onSuccess, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/espace-client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientId: data.get("clientId"),
          token: data.get("token"),
        }),
      });

      const json = (await res.json()) as {
        error?: string;
        clientId?: string;
        profile?: ClientProfileData;
      };
      if (!res.ok) throw new Error(json.error ?? "Connexion impossible.");

      if (!json.clientId || !json.profile) {
        throw new Error("Réponse serveur invalide.");
      }

      onSuccess({ clientId: json.clientId, profile: json.profile });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)} noValidate>
      <div className="flex items-center gap-3 rounded-xl bg-primary-light/40 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
          <LockKeyhole className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Accès sécurisé</p>
          <p className="text-xs text-gray-text">Session valide 8 h · connexion chiffrée</p>
        </div>
      </div>

      <div>
        <label htmlFor="clientId" className="mb-1.5 block text-sm font-medium text-foreground">
          Identifiant client
        </label>
        <input
          id="clientId"
          name="clientId"
          required
          autoComplete="username"
          autoFocus
          placeholder="ex. acme-corp"
          className={fieldClass}
        />
        <p className="mt-1.5 text-xs text-gray-text">
          Transmis par email lors de l&apos;ouverture de votre espace.
        </p>
      </div>

      <div>
        <label htmlFor="token" className="mb-1.5 block text-sm font-medium text-foreground">
          Code d&apos;accès
        </label>
        <div className="relative">
          <input
            id="token"
            name="token"
            type={showToken ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Votre code personnel"
            className={cn(fieldClass, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-text hover:bg-gray-light hover:text-foreground"
            aria-label={showToken ? "Masquer le code" : "Afficher le code"}
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" aria-hidden />
            ) : (
              <Eye className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden />
        )}
        Accéder à mon espace
      </button>
    </form>
  );
}
