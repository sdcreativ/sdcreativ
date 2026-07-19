"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchCrmArchives, fetchProjectArchive } from "@/lib/projects-api";
import { formatInvoiceAmount } from "@/content/invoices-labels";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/content/quotes-labels";
import { Archive, Download, Loader2, RefreshCw } from "lucide-react";

export function CrmArchivesView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchCrmArchives>> | null>(null);
  const [pdfLinks, setPdfLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchCrmArchives();
      setData(result);
      const links: Record<string, string> = {};
      await Promise.all(
        result.bundles.slice(0, 30).map(async (bundle) => {
          try {
            const detail = await fetchProjectArchive(bundle.projectId);
            if (detail.bundle?.pdfUrl) links[bundle.projectId] = detail.bundle.pdfUrl;
          } catch {
            /* ignore */
          }
        }),
      );
      setPdfLinks(links);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Archive className="h-5 w-5 text-primary" aria-hidden />
            Archives
          </h2>
          <p className="mt-1 text-sm text-gray-text">
            Dossiers livrés archivés (devis, factures soldées, manifeste S3). Consultation seule.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-3 py-2 text-sm font-medium hover:bg-gray-light"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualiser
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          Chargement…
        </p>
      ) : error ? (
        <p className="text-sm text-accent">{error}</p>
      ) : !data || data.bundles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray/50 bg-white px-6 py-16 text-center text-sm text-gray-text">
          Aucun dossier archivé pour le moment.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray/40 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-light/60 text-xs uppercase tracking-wide text-gray-text">
              <tr>
                <th className="px-4 py-3">Projet</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Archivé le</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.bundles.map((bundle) => (
                <tr key={bundle.id} className="border-t border-gray/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link
                      href={`/admin/crm/projets/${bundle.projectId}`}
                      className="text-primary hover:underline"
                    >
                      {bundle.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-text">{bundle.clientLabel}</td>
                  <td className="px-4 py-3 text-gray-text">
                    {new Date(bundle.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pdfLinks[bundle.projectId] ? (
                      <a
                        href={pdfLinks[bundle.projectId]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        Manifeste
                      </a>
                    ) : (
                      <Link
                        href={`/admin/crm/projets/${bundle.projectId}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Ouvrir
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (data.quotes.length > 0 || data.invoices.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-gray/40 bg-white p-4">
            <h3 className="text-sm font-bold text-foreground">Devis archivés</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {data.quotes.slice(0, 20).map((q) => (
                <li key={q.id} className="flex justify-between gap-2">
                  <Link href={`/admin/crm/devis?id=${q.id}`} className="font-medium text-primary hover:underline">
                    {q.reference}
                  </Link>
                  <span className="text-xs text-gray-text">
                    {QUOTE_STATUS_LABELS[q.status as QuoteStatus] ?? q.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-gray/40 bg-white p-4">
            <h3 className="text-sm font-bold text-foreground">Factures archivées</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {data.invoices.slice(0, 20).map((inv) => (
                <li key={inv.id} className="flex justify-between gap-2">
                  <span className="font-medium">{inv.reference}</span>
                  <span className="text-xs text-gray-text">
                    {formatInvoiceAmount(inv.total)} · {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
