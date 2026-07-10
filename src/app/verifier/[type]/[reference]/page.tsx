import { notFound } from "next/navigation";
import { ShieldCheck, ShieldX } from "lucide-react";
import { verifyPublicDocument } from "@/lib/billing/verify-document";
import type { VerifyDocumentType } from "@/lib/billing/verify-token";
import { isDatabaseConfigured } from "@/lib/db";
import { formatInvoiceDate } from "@/content/invoices-labels";

const TYPE_MAP: Record<string, VerifyDocumentType> = {
  devis: "quote",
  facture: "invoice",
};

const TYPE_LABELS: Record<string, string> = {
  devis: "Devis",
  facture: "Facture",
};

type Props = {
  params: Promise<{ type: string; reference: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function VerifyDocumentPage({ params, searchParams }: Props) {
  const { type, reference } = await params;
  const { t } = await searchParams;

  if (!TYPE_MAP[type]) notFound();
  if (!isDatabaseConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-gray-600">Service de vérification indisponible.</p>
      </main>
    );
  }

  const result = await verifyPublicDocument({
    type: TYPE_MAP[type],
    reference: decodeURIComponent(reference),
    token: t,
  });

  const typeLabel = TYPE_LABELS[type] ?? "Document";

  return (
    <main className="min-h-screen bg-[#eef2f7] px-4 py-12">
      <div className="mx-auto max-w-lg rounded-2xl border border-gray/40 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-center text-center">
          {result.valid ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-8 w-8" aria-hidden />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-700">
              <ShieldX className="h-8 w-8" aria-hidden />
            </div>
          )}

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Vérification SD CREATIV
          </p>
          <h1 className="mt-1 text-xl font-bold text-foreground">
            {typeLabel} {result.reference}
          </h1>
          <p className={`mt-3 text-sm ${result.valid ? "text-emerald-700" : "text-red-700"}`}>
            {result.message ?? (result.valid ? "Document vérifié." : "Vérification échouée.")}
          </p>
        </div>

        {result.valid && (
          <dl className="mt-8 space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Statut</dt>
              <dd className="font-semibold text-foreground">{result.statusLabel}</dd>
            </div>
            {result.issuedAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Émis le</dt>
                <dd className="font-medium">{formatInvoiceDate(result.issuedAt)}</dd>
              </div>
            )}
            {result.documentHashShort && (
              <div>
                <dt className="text-gray-500">Empreinte SHA-256</dt>
                <dd className="mt-1 break-all font-mono text-xs text-foreground">
                  {result.documentHashShort}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-gray/30 pt-3">
              <dt className="text-gray-500">Vérifié le</dt>
              <dd className="font-medium">{formatInvoiceDate(result.verifiedAt)}</dd>
            </div>
          </dl>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          SD CREATIV — Agence Web & Solutions Digitales
        </p>
      </div>
    </main>
  );
}
