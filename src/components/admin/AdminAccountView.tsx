"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogOut,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

type AccountInfo = {
  userId: string;
  email: string;
  name: string;
  role: string;
  roleLabel?: string;
  mustChangePassword: boolean;
};

export function AdminAccountView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const required = searchParams.get("required") === "1";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/account", { credentials: "include" });
        const data = (await res.json()) as { account?: AccountInfo; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Session expirée.");
        setAccount(data.account ?? null);
        if (
          !required &&
          data.account &&
          !data.account.mustChangePassword
        ) {
          router.replace("/admin/crm/compte");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger le compte.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    const mustChange = account?.mustChangePassword ?? required;
    if (!mustChange && !currentPassword) {
      setError("Indiquez votre mot de passe actuel.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: mustChange ? undefined : currentPassword,
          newPassword,
        }),
      });
      const data = (await res.json()) as { error?: string; account?: AccountInfo };
      if (!res.ok) throw new Error(data.error ?? "Mise à jour impossible.");

      setSuccess("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setAccount(data.account ?? null);

      setTimeout(() => {
        router.push("/admin/crm");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const mustChange = account?.mustChangePassword ?? required;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-4">
      <div className="w-full max-w-lg">
        <Logo href="/" variant="mark" size="centered" priority className="mb-8 inline-block w-full" />

        <div className="rounded-2xl border border-gray/30 bg-white p-8 shadow-lg shadow-gray/10">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon compte</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">
                {mustChange ? "Définissez votre mot de passe" : "Sécurité du compte"}
              </h1>
            </div>
            {!mustChange && (
              <Link
                href="/admin/crm"
                className="text-sm font-medium text-primary hover:underline"
              >
                ← CRM
              </Link>
            )}
          </div>

          {mustChange && (
            <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Première connexion : choisissez un mot de passe personnel (8 caractères minimum).
                Le secret de déploiement ne pourra plus servir à vous connecter.
              </span>
            </div>
          )}

          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-text">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Chargement…
            </p>
          ) : account ? (
            <>
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-gray/25 bg-gray-light/30 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{account.name}</p>
                  <p className="text-sm text-gray-text">{account.email}</p>
                  {account.roleLabel && (
                    <p className="text-xs text-gray-text">{account.roleLabel}</p>
                  )}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!mustChange && (
                  <div>
                    <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-foreground">
                      Mot de passe actuel
                    </label>
                    <input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      className={fieldClass}
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
                    {mustChange ? "Nouveau mot de passe" : "Nouveau mot de passe"}
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className={cn(fieldClass, "pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-text hover:bg-gray-light"
                      aria-label={showPassword ? "Masquer" : "Afficher"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={fieldClass}
                  />
                </div>

                {success && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {mustChange ? "Enregistrer et accéder au CRM" : "Mettre à jour le mot de passe"}
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-accent">{error || "Session invalide."}</p>
          )}

          <button
            type="button"
            onClick={() => void logout()}
            className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
