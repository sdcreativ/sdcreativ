"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  FileSignature,
  Loader2,
  Mail,
  PenLine,
} from "lucide-react";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { cn } from "@/lib/utils";

type ContractSummary = {
  id: string;
  reference: string;
  title: string;
  employeeName: string | null;
  contractTypeLabel: string;
  jobTitle: string | null;
  amountLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  canSign: boolean;
  signerEmailHint: string | null;
};

type Step = "review" | "otp" | "sign" | "done";

export function EmployeeContractNativeSignView({ token }: { token: string }) {
  const [contract, setContract] = useState<ContractSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("review");
  const [signerName, setSignerName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpDisplayTo, setOtpDisplayTo] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/espace-equipe/sign/contract/${encodeURIComponent(token)}`,
      );
      const json = (await res.json()) as { contract?: ContractSummary; error?: string };
      if (!res.ok) throw new Error(json.error);
      setContract(json.contract ?? null);
      if (json.contract?.employeeName) setSignerName(json.contract.employeeName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lien invalide.");
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendOtp() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/espace-equipe/sign/contract/${encodeURIComponent(token)}/challenge`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        displayTo?: string;
        expiresInMinutes?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error);
      setOtpDisplayTo(json.displayTo ?? "");
      setStep("otp");
      setMessage(`Code envoyé${json.displayTo ? ` à ${json.displayTo}` : ""}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (!signatureData) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/espace-equipe/sign/contract/${encodeURIComponent(token)}/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerName,
            signatureData,
            otpCode,
            acceptTerms: true,
          }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      setStep("done");
      setMessage("Contrat signé. Merci — SD CREATIV a été notifié.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Signature impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-gray-text">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
        Chargement du contrat…
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-bold text-foreground">Lien indisponible</p>
        <p className="mt-2 text-sm text-gray-text">{error || "Contrat introuvable."}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-gray/40 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Signature contrat RH · SD CREATIV
        </p>
        <h1 className="mt-2 text-xl font-bold text-foreground">{contract.title}</h1>
        <p className="mt-1 font-mono text-xs text-gray-text">
          {contract.reference} · {contract.contractTypeLabel}
        </p>
        {contract.jobTitle && (
          <p className="mt-2 text-sm text-gray-text">{contract.jobTitle}</p>
        )}
        {contract.amountLabel && (
          <p className="mt-3 text-2xl font-bold text-primary">{contract.amountLabel}</p>
        )}
        <p className="mt-3 text-xs text-gray-text">
          Signature électronique simple renforcée (preuve métier) — pas une signature eIDAS
          qualifiée. Pour une signature à forte valeur juridique, utilisez Yousign depuis le CRM.
        </p>

        {message && (
          <p className="mt-4 rounded-xl border border-gray/30 bg-gray-light/40 px-3 py-2 text-xs">
            {message}
          </p>
        )}

        {step === "done" ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            Signature enregistrée.
          </p>
        ) : !contract.canSign ? (
          <p className="mt-6 text-sm text-gray-text">Ce contrat n&apos;est plus signable.</p>
        ) : (
          <div className="mt-6 space-y-4">
            <ol className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
              {(
                [
                  ["review", "1. Revue"],
                  ["otp", "2. Code"],
                  ["sign", "3. Signature"],
                ] as const
              ).map(([s, label]) => (
                <li
                  key={s}
                  className={cn(
                    "rounded-full px-2.5 py-1",
                    step === s ? "bg-primary text-white" : "bg-gray-light text-gray-text",
                  )}
                >
                  {label}
                </li>
              ))}
            </ol>

            {step === "review" && (
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-gray-text">Nom complet</span>
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || signerName.trim().length < 2}
                  onClick={() => void sendOtp()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Recevoir le code par email
                </button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-text">
                  Code reçu{otpDisplayTo ? ` sur ${otpDisplayTo}` : ""}
                  {contract.signerEmailHint ? ` (${contract.signerEmailHint})` : ""}.
                </p>
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border px-3 py-2.5 font-mono tracking-widest"
                  placeholder="SD-XXXXXX"
                />
                <button
                  type="button"
                  disabled={busy || otpCode.trim().length < 4}
                  onClick={() => setStep("sign")}
                  className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Continuer
                </button>
              </div>
            )}

            {step === "sign" && (
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-gray-text">
                  <PenLine className="h-3.5 w-3.5" />
                  Votre signature
                </p>
                <SignaturePad onChange={setSignatureData} />
                <label className="flex items-start gap-2 text-xs text-gray-text">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    J&apos;accepte les conditions du contrat et confirme ma signature SD CREATIV.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={busy || !signatureData || !acceptTerms}
                  onClick={() => void finalize()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                  Finaliser la signature
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
