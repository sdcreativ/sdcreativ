"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LockKeyhole,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeLoginEmailOtp } from "@/lib/crm-email-otp-utils";
import type { Login2faMethod } from "@/lib/crm-totp-challenge";

const CRM_MODULES = [
  { icon: LayoutDashboard, label: "Tableau de bord" },
  { icon: Target, label: "Leads & pipeline" },
  { icon: Users, label: "Clients" },
  { icon: FolderKanban, label: "Projets" },
  { icon: LifeBuoy, label: "Tickets support" },
  { icon: BarChart3, label: "Rapports" },
] as const;

const fieldClass =
  "w-full rounded-xl border border-gray/80 bg-white px-4 py-3.5 text-sm text-foreground shadow-sm transition-all placeholder:text-gray-text/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

function routeLabel(from: string): string {
  if (from.includes("/leads")) return "Leads";
  if (from.includes("/clients")) return "Clients";
  if (from.includes("/projets")) return "Projets";
  if (from.includes("/devis")) return "Devis";
  if (from.includes("/taches")) return "Tâches";
  if (from.includes("/tickets")) return "Tickets";
  if (from.includes("/calendrier")) return "Calendrier";
  if (from.includes("/rapports")) return "Rapports";
  if (from.includes("/parametres")) return "Paramètres";
  if (from.includes("/documents")) return "Documents";
  return "CRM";
}

export function AdminLoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin/crm";
  const activated = searchParams.get("activated") === "1";

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [challengeToken, setChallengeToken] = useState("");
  const [twoFactorMethod, setTwoFactorMethod] = useState<Login2faMethod>("email");
  const [otpCode, setOtpCode] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [pendingUser, setPendingUser] = useState<{ name: string; email: string } | null>(null);
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<"personal" | "professional" | null>(null);

  function isOtpCodeValid(): boolean {
    if (twoFactorMethod === "totp") return otpCode.length === 6;
    return normalizeLoginEmailOtp(otpCode) !== null;
  }

  async function handleResendCode() {
    setResendBusy(true);
    setResendMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/login/2fa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken }),
      });
      const data = (await res.json()) as {
        error?: string;
        otpSentTo?: string;
        otpChannel?: "personal" | "professional";
      };
      if (!res.ok) throw new Error(data.error ?? "Renvoi impossible.");
      if (data.otpSentTo) setOtpSentTo(data.otpSentTo);
      if (data.otpChannel) setOtpChannel(data.otpChannel);
      setResendMessage(
        data.otpChannel === "personal"
          ? "Un nouveau code a été envoyé sur votre email personnel."
          : "Un nouveau code a été envoyé par email.",
      );
      setOtpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renvoi impossible.");
    } finally {
      setResendBusy(false);
    }
  }

  async function completeLogin(res: Response) {
    const data = (await res.json()) as { error?: string; mustChangePassword?: boolean };
    if (!res.ok) {
      throw new Error(data.error ?? "Accès refusé");
    }
    if (data.mustChangePassword) {
      router.push("/admin/compte?required=1");
      router.refresh();
      return;
    }
    router.push(from);
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (step === "2fa") {
        const res = await fetch("/api/admin/login/2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken, code: otpCode }),
        });
        await completeLogin(res);
        return;
      }

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined, password }),
      });

      const data = (await res.json()) as {
        error?: string;
        requires2fa?: boolean;
        method?: Login2faMethod;
        mustChangePassword?: boolean;
        challengeToken?: string;
        otpSentTo?: string;
        otpChannel?: "personal" | "professional";
        user?: { name: string; email: string };
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Accès refusé");
      }

      if (data.requires2fa && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setTwoFactorMethod(data.method ?? "email");
        setPendingUser(data.user ?? null);
        setOtpSentTo(data.otpSentTo ?? data.user?.email ?? null);
        setOtpChannel(data.otpChannel ?? "professional");
        setStep("2fa");
        setOtpCode("");
        setResendMessage("");
        return;
      }

      if (data.mustChangePassword) {
        router.push("/admin/compte?required=1");
        router.refresh();
        return;
      }

      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-[#eef2f7]">
      {/* Panneau gauche */}
      <div className="relative hidden w-[44%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[#071525]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
          aria-hidden
        />
        <div className="relative flex flex-1 flex-col justify-between p-10 xl:p-12">
          <div>
            <Logo href="/" variant="mark" size="panel" onDark priority className="inline-block" />
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">
              CRM interne
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-white xl:text-4xl">
              Pilotez votre
              <br />
              <span className="text-sky-300">activité commerciale.</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/65">
              Leads, clients, projets, devis, factures et support — un seul tableau de bord pour
              l&apos;équipe SD CREATIV.
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-2">
            {CRM_MODULES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/85"
              >
                <Icon className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs text-white/40">
            Accès réservé à l&apos;équipe SD CREATIV · usage interne uniquement
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-gray/30 bg-[#071525] px-6 py-8 text-white lg:hidden">
          <Logo href="/" variant="mark" size="panelMobile" onDark className="inline-block" />
          <p className="mt-4 text-lg font-bold">Accès admin CRM</p>
        </div>

        <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Administration
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
              {step === "2fa" ? "Vérification 2FA" : "Connexion CRM"}
            </h2>

            {step === "2fa" && pendingUser && (
              <p className="mt-4 rounded-xl border border-primary/20 bg-primary-light/30 px-4 py-2.5 text-sm text-gray-text">
                {twoFactorMethod === "email" ? (
                  <>
                    Code envoyé{" "}
                    {otpChannel === "personal" ? (
                      <>
                        sur votre <span className="font-semibold text-foreground">email personnel</span>{" "}
                        <span className="font-semibold text-foreground">
                          {otpSentTo ?? "…"}
                        </span>
                      </>
                    ) : (
                      <>
                        à{" "}
                        <span className="font-semibold text-foreground">
                          {otpSentTo ?? pendingUser.email}
                        </span>
                        {" "}
                        <span className="text-accent">
                          (aucun email personnel configuré — renseignez-le dans Mon compte)
                        </span>
                      </>
                    )}{" "}
                    (format SD-XXXXXX, valable 10 min).
                  </>
                ) : (
                  <>
                    Code authenticator requis pour{" "}
                    <span className="font-semibold text-foreground">{pendingUser.email}</span>
                  </>
                )}
              </p>
            )}

            {from !== "/admin/crm" && step === "login" && (
              <p className="mt-4 rounded-xl border border-primary/20 bg-primary-light/30 px-4 py-2.5 text-sm text-gray-text">
                Connexion requise pour accéder à{" "}
                <span className="font-semibold text-foreground">{routeLabel(from)}</span>.
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-2xl border border-gray/50 bg-white p-6 shadow-sm ring-1 ring-black/[0.02] md:p-8"
            >
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-primary-light/40 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                  <LockKeyhole className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Session sécurisée</p>
                </div>
              </div>

              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email (compte équipe)
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sdcreativ.com"
                autoComplete="username"
                required
                className={`${fieldClass} mb-4`}
                disabled={step === "2fa"}
              />

              {step === "login" ? (
                <>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  required
                  autoFocus
                  autoComplete="current-password"
                  className={cn(fieldClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-text hover:bg-gray-light hover:text-foreground"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
                </>
              ) : (
                <>
                  {twoFactorMethod === "totp" ? (
                    <>
                      <label htmlFor="admin-totp" className="mb-1.5 block text-sm font-medium text-foreground">
                        Code authenticator (6 chiffres)
                      </label>
                      <input
                        id="admin-totp"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        required
                        autoFocus
                        autoComplete="one-time-code"
                        className={cn(fieldClass, "tracking-[0.35em]")}
                      />
                    </>
                  ) : (
                    <>
                      <label htmlFor="admin-email-otp" className="mb-1.5 block text-sm font-medium text-foreground">
                        Code reçu par email
                      </label>
                      <input
                        id="admin-email-otp"
                        type="text"
                        inputMode="text"
                        maxLength={9}
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9))
                        }
                        placeholder="SD-XXXXXX"
                        required
                        autoFocus
                        autoComplete="one-time-code"
                        className={cn(fieldClass, "font-mono tracking-wider uppercase")}
                      />
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => void handleResendCode()}
                          disabled={resendBusy || loading}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {resendBusy ? "Envoi…" : "Renvoyer le code"}
                        </button>
                        {resendMessage && (
                          <span className="text-xs text-emerald-700">{resendMessage}</span>
                        )}
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setStep("login");
                      setChallengeToken("");
                      setOtpCode("");
                      setResendMessage("");
                      setError("");
                    }}
                    className="mt-3 text-xs font-medium text-primary hover:underline"
                  >
                    ← Retour à la connexion
                  </button>
                </>
              )}

              {activated && step === "login" && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>Compte activé. Connectez-vous avec votre email et le mot de passe choisi.</span>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (step === "2fa" && !isOtpCodeValid())}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-md disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {step === "2fa" ? "Valider le code 2FA" : "Connexion au CRM"}
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-gray-text">
              <Link href="/espace-client" className="font-semibold text-primary hover:underline">
                Espace client
              </Link>
              <span className="text-gray/60">·</span>
              <Link href="/" className="hover:text-foreground hover:underline">
                Retour au site
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
