"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from "lucide-react";
import { CrmTotpSection } from "@/components/admin/CrmTotpSection";
import { CrmProfileAvatarField } from "@/components/admin/CrmProfileAvatarField";
import { notifyCrmSessionChanged } from "@/lib/crm-session-events";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-xl border border-gray/60 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type AccountInfo = {
  userId: string;
  email: string;
  personalEmail: string | null;
  name: string;
  role: string;
  roleLabel?: string;
  avatarUrl: string | null;
};

type Tab = "profile" | "security";

export function CrmProfileView() {
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [name, setName] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account", { credentials: "include" });
      const data = (await res.json()) as { account?: AccountInfo; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Impossible de charger le profil.");
      const acc = data.account ?? null;
      setAccount(acc);
      setName(acc?.name ?? "");
      setPersonalEmail(acc?.personalEmail ?? "");
      setAvatarUrl(acc?.avatarUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          personalEmail: personalEmail.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; account?: AccountInfo };
      if (!res.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setAccount(data.account ?? null);
      setPersonalEmail(data.account?.personalEmail ?? "");
      setSuccess("Profil mis à jour.");
      notifyCrmSessionChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Mise à jour impossible.");
      setSuccess("Mot de passe mis à jour.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement du profil…
      </div>
    );
  }

  if (!account) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-white p-8 text-sm text-accent">
        {error || "Profil indisponible."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Mon compte</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Profil & sécurité</h1>
        <p className="mt-1 text-sm text-gray-text">
          Gérez votre identité, votre photo et vos options de connexion sécurisée.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray/30 pb-1">
        {(
          [
            { id: "profile" as const, label: "Profil" },
            { id: "security" as const, label: "Sécurité" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setError("");
              setSuccess("");
            }}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-b-2 border-primary text-primary"
                : "text-gray-text hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {(error || success) && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-accent/30 bg-accent/5 text-accent",
          )}
        >
          {success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          <span>{success || error}</span>
        </div>
      )}

      {tab === "profile" ? (
        <form onSubmit={saveProfile} className="space-y-6 rounded-2xl border border-gray/30 bg-white p-6 shadow-sm">
          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Photo de profil</p>
            <CrmProfileAvatarField
              name={name || account.name}
              avatarUrl={avatarUrl}
              onChange={setAvatarUrl}
            />
          </div>

          <div>
            <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-foreground">
              Nom affiché
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={160}
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email professionnel
            </label>
            <input
              id="profile-email"
              type="email"
              value={account.email}
              readOnly
              className={cn(fieldClass, "cursor-not-allowed bg-gray-light/40 text-gray-text")}
            />
            <p className="mt-1 text-xs text-gray-text">
              Rôle : {account.roleLabel ?? account.role}
            </p>
          </div>

          <div>
            <label htmlFor="profile-personal-email" className="mb-1.5 block text-sm font-medium text-foreground">
              Email personnel (2FA)
            </label>
            <input
              id="profile-personal-email"
              type="email"
              value={personalEmail}
              onChange={(e) => setPersonalEmail(e.target.value)}
              placeholder="vous@gmail.com"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-gray-text">
              Le code de connexion SD-XXXXXX est envoyé ici, pas sur la boîte Hostinger.
            </p>
          </div>

          <button
            type="submit"
            disabled={
              savingProfile ||
              (name.trim() === account.name &&
                (personalEmail.trim() || null) === (account.personalEmail || null))
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
          >
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Enregistrer le profil
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={savePassword}
            className="space-y-4 rounded-2xl border border-gray/30 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mot de passe</p>
                <p className="text-xs text-gray-text">8 caractères minimum</p>
              </div>
            </div>

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
                required
                className={fieldClass}
              />
            </div>

            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Nouveau mot de passe
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

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Mettre à jour le mot de passe
            </button>
          </form>

          <div className="rounded-2xl border border-gray/30 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
                <UserRound className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Authentification à deux facteurs</p>
                <p className="text-xs text-gray-text">
                  TOTP prioritaire — sinon code email à chaque connexion.
                </p>
              </div>
            </div>
            <CrmTotpSection />
          </div>
        </div>
      )}
    </div>
  );
}
