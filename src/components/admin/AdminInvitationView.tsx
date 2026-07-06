"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

type Props = {
  token: string;
};

export function AdminInvitationView({ token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [valid, setValid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/admin/invitation?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          valid?: boolean;
          expired?: boolean;
          name?: string;
          email?: string;
          error?: string;
        };
        setValid(Boolean(data.valid));
        setExpired(Boolean(data.expired));
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        if (!data.valid && !data.expired) {
          setError(data.error ?? "Lien d'invitation invalide.");
        }
      } catch {
        setError("Impossible de vérifier le lien.");
      } finally {
        setLoading(false);
      }
    }
    void validate();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Activation impossible.");
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/login?activated=1");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] p-4">
      <div className="w-full max-w-md">
          <Logo href="/" variant="mark" size="centered" priority className="mb-8 inline-block w-full" />

        <div className="rounded-2xl border border-gray/30 bg-white p-8 shadow-lg shadow-gray/10">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-gray-text">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              Vérification du lien…
            </p>
          ) : success ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
              <h1 className="mt-4 text-xl font-bold text-foreground">Compte activé</h1>
              <p className="mt-2 text-sm text-gray-text">
                Redirection vers la connexion…
              </p>
            </div>
          ) : expired ? (
            <div className="py-4 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden />
              <h1 className="mt-4 text-xl font-bold text-foreground">Lien expiré</h1>
              <p className="mt-2 text-sm text-gray-text">
                Ce lien d&apos;invitation n&apos;est plus valide
                {email ? ` (${email})` : ""}. Demandez à votre administrateur de renvoyer une
                invitation.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : !valid ? (
            <div className="py-4 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-accent" aria-hidden />
              <h1 className="mt-4 text-xl font-bold text-foreground">Lien invalide</h1>
              <p className="mt-2 text-sm text-gray-text">
                {error || "Ce lien d'invitation est invalide ou a déjà été utilisé."}
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <LockKeyhole className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground">Activez votre compte</h1>
                <p className="mt-2 text-sm text-gray-text">
                  Bonjour <strong>{name}</strong>, définissez votre mot de passe pour accéder au CRM.
                </p>
              </div>

              {error && (
                <p className="mb-4 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="invitation-password" className="mb-1.5 block text-xs font-semibold text-gray-text">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <input
                      id="invitation-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(fieldClass, "pr-11")}
                      placeholder="Minimum 8 caractères"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-text hover:text-foreground"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="invitation-confirm" className="mb-1.5 block text-xs font-semibold text-gray-text">
                    Confirmer le mot de passe *
                  </label>
                  <input
                    id="invitation-confirm"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={fieldClass}
                    placeholder="Répétez le mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Activation…
                    </>
                  ) : (
                    "Activer mon compte"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
