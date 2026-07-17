"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSignature,
  Loader2,
  Mail,
  PenLine,
  XCircle,
} from "lucide-react";
import { formatQuoteAmount, formatQuoteDate } from "@/content/quotes-labels";
import { SignaturePad } from "@/components/signature/SignaturePad";
import { cn } from "@/lib/utils";

type QuoteSummary = {
  id: string;
  reference: string;
  projectLabel: string;
  subtotal: number;
  status: string;
  statusLabel: string;
  validUntil: string | null;
  downloadUrl: string | null;
};

type QuoteDetail = QuoteSummary & {
  lines: Array<{ label: string; amount: number }>;
  message: string | null;
  canSign: boolean;
  canReject: boolean;
  signedAt: string | null;
  rejectionReason: string | null;
};

type SignStep = "review" | "otp" | "sign";

function statusTone(status: string): string {
  if (status === "signed" || status === "validated" || status === "invoiced") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "rejected" || status === "expired") {
    return "bg-red-100 text-red-800";
  }
  if (status === "viewed") {
    return "bg-indigo-100 text-indigo-800";
  }
  return "bg-sky-100 text-sky-800";
}

export function ClientPortalQuotesView() {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpDisplayTo, setOtpDisplayTo] = useState("");
  const [signStep, setSignStep] = useState<SignStep>("review");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/espace-client/quotes", { credentials: "include" });
      const json = (await res.json()) as { quotes?: QuoteSummary[]; error?: string };
      if (!res.ok) throw new Error(json.error);
      setQuotes(json.quotes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/espace-client/quotes/${id}`, { credentials: "include" });
      const json = (await res.json()) as { quote?: QuoteDetail; error?: string };
      if (!res.ok) throw new Error(json.error);
      setDetail(json.quote ?? null);
      void loadList();
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "Devis introuvable.");
    } finally {
      setDetailLoading(false);
    }
  }, [loadList]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) {
      setSignStep("review");
      setOtpCode("");
      setSignatureData(null);
      setAcceptTerms(false);
      void loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  async function handleSendOtp() {
    if (!selectedId) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/espace-client/quotes/${selectedId}/sign/challenge`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        displayTo?: string;
        expiresInMinutes?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error);
      setOtpDisplayTo(json.displayTo ?? "");
      setSignStep("otp");
      setActionMessage(
        `Code envoyé${json.displayTo ? ` à ${json.displayTo}` : ""} (valable ${json.expiresInMinutes ?? 10} min).`,
      );
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Envoi du code impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSign() {
    if (!selectedId || !signatureData) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/espace-client/quotes/${selectedId}/sign`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName,
          signatureData,
          otpCode,
          acceptTerms: true,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      setActionMessage("Devis signé avec succès. L'équipe SD CREATIV a été notifiée.");
      setSignStep("review");
      await loadDetail(selectedId);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Signature impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedId) return;
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/espace-client/quotes/${selectedId}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error);
      setActionMessage("Votre refus a été enregistré.");
      setShowReject(false);
      await loadDetail(selectedId);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Refus impossible.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement de vos devis…
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-5">
      <section className="lg:col-span-2">
        <div className="rounded-2xl border border-gray/40 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground">Mes devis</h2>
          <p className="mt-0.5 text-xs text-gray-text">Consultez, téléchargez et signez vos propositions.</p>

          {error && !selectedId && (
            <p className="mt-3 rounded-xl bg-accent/5 px-3 py-2 text-xs text-accent">{error}</p>
          )}

          {quotes.length === 0 ? (
            <p className="mt-6 py-8 text-center text-sm text-gray-text">Aucun devis disponible pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {quotes.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(q.id)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      selectedId === q.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-gray/30 hover:border-primary/20 hover:bg-gray-light/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-primary">{q.reference}</p>
                        <p className="mt-0.5 text-sm font-medium text-foreground">{q.projectLabel}</p>
                        <p className="text-xs text-gray-text">{formatQuoteAmount(q.subtotal)}</p>
                      </div>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold", statusTone(q.status))}>
                        {q.statusLabel}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="lg:col-span-3">
        {!selectedId ? (
          <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-gray/40 bg-white/60 p-8 text-center text-sm text-gray-text">
            Sélectionnez un devis pour voir le détail.
          </div>
        ) : detailLoading || !detail ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-gray/40 bg-white p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-semibold text-primary">{detail.reference}</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{detail.projectLabel}</h3>
                <span className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold", statusTone(detail.status))}>
                  {detail.statusLabel}
                </span>
              </div>
              {detail.downloadUrl && (
                <a
                  href={detail.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Télécharger
                </a>
              )}
            </div>

            <p className="mt-4 text-2xl font-bold text-primary">{formatQuoteAmount(detail.subtotal)}</p>

            {detail.lines.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-xl bg-gray-light/50 p-3 text-sm">
                {detail.lines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="text-gray-text">{line.label}</span>
                    <span className="font-medium">{formatQuoteAmount(line.amount)}</span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-4 grid gap-2 text-xs text-gray-text sm:grid-cols-2">
              {detail.validUntil && (
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Valable jusqu&apos;au</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{formatQuoteDate(detail.validUntil)}</dd>
                </div>
              )}
              {detail.signedAt && (
                <div>
                  <dt className="font-semibold uppercase tracking-wide">Signé le</dt>
                  <dd className="mt-0.5 text-sm text-foreground">{formatQuoteDate(detail.signedAt)}</dd>
                </div>
              )}
            </dl>

            {detail.rejectionReason && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                Motif de refus : {detail.rejectionReason}
              </p>
            )}

            {detail.status === "signed" && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                Devis signé — en cours de validation par notre équipe.
              </p>
            )}

            {actionMessage && (
              <p className="mt-4 rounded-xl border border-gray/30 bg-gray-light/40 px-3 py-2 text-xs text-foreground">
                {actionMessage}
              </p>
            )}

            {detail.canSign && (
              <div className="mt-6 space-y-4 border-t border-gray/30 pt-5">
                <h4 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <FileSignature className="h-4 w-4 text-primary" aria-hidden />
                  Signature SD CREATIV
                </h4>
                <p className="text-xs text-gray-text">
                  Signature électronique simple renforcée (preuve métier) — code email, tracé et empreinte PDF.
                  Ce n&apos;est pas une signature eIDAS qualifiée type Yousign.
                </p>

                <ol className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
                  {(
                    [
                      ["review", "1. Revue"],
                      ["otp", "2. Code email"],
                      ["sign", "3. Signature"],
                    ] as const
                  ).map(([step, label]) => (
                    <li
                      key={step}
                      className={cn(
                        "rounded-full px-2.5 py-1",
                        signStep === step ? "bg-primary text-white" : "bg-gray-light text-gray-text",
                      )}
                    >
                      {label}
                    </li>
                  ))}
                </ol>

                {signStep === "review" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-text">
                      Vérifiez le montant et les lignes ci-dessus, puis demandez un code de confirmation.
                    </p>
                    <label className="block text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-text">Nom complet</span>
                      <input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-gray/60 px-3 py-2.5"
                        placeholder="Prénom Nom"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={actionLoading || signerName.trim().length < 2}
                      onClick={() => void handleSendOtp()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Mail className="h-4 w-4" aria-hidden />
                      )}
                      Recevoir le code par email
                    </button>
                  </div>
                )}

                {signStep === "otp" && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-text">
                      Saisissez le code reçu{otpDisplayTo ? ` sur ${otpDisplayTo}` : ""}.
                    </p>
                    <input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-gray/60 px-3 py-2.5 font-mono text-lg tracking-widest"
                      placeholder="SD-XXXXXX"
                      autoComplete="one-time-code"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionLoading || otpCode.trim().length < 4}
                        onClick={() => setSignStep("sign")}
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Continuer
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleSendOtp()}
                        className="rounded-xl border px-4 py-2.5 text-sm font-medium"
                      >
                        Renvoyer
                      </button>
                    </div>
                  </div>
                )}

                {signStep === "sign" && (
                  <div className="space-y-3">
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-text">
                        <PenLine className="h-3.5 w-3.5" aria-hidden />
                        Signez dans le cadre
                      </p>
                      <SignaturePad onChange={setSignatureData} />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-gray-text">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        J&apos;accepte les conditions du devis et confirme ma signature électronique SD CREATIV
                        (preuve renforcée).
                      </span>
                    </label>
                    <button
                      type="button"
                      disabled={actionLoading || !signatureData || !acceptTerms}
                      onClick={() => void handleSign()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      )}
                      Finaliser la signature
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowReject((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline"
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  Refuser ce devis
                </button>
              </div>
            )}

            {showReject && detail.canReject && (
              <div className="mt-4 space-y-3 rounded-xl border border-red-200/60 bg-red-50/50 p-4">
                <label className="block text-sm">
                  <span className="text-xs font-semibold text-red-800">Motif du refus</span>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-red-200/60 px-3 py-2 text-sm"
                    placeholder="Expliquez brièvement votre décision…"
                  />
                </label>
                <button
                  type="button"
                  disabled={actionLoading || rejectReason.trim().length < 3}
                  onClick={() => void handleReject()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmer le refus
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
