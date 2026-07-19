"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  archiveProjectApi,
  fetchProjectArchive,
} from "@/lib/projects-api";
import type { Project } from "@/lib/projects";
import { useDialog } from "@/components/ui/DialogProvider";
import { Archive, CheckCircle2, Circle, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  onArchived: (project: Project) => void;
};

export function ProjectArchivePanel({ project, onArchived }: Props) {
  const { confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [checklist, setChecklist] = useState<
    Array<{ id: string; label: string; ok: boolean; detail?: string }>
  >([]);
  const [canArchive, setCanArchive] = useState(false);
  const [alreadyArchived, setAlreadyArchived] = useState(Boolean(project.archivedAt));
  const [bundle, setBundle] = useState<{
    manifestUrl?: string | null;
    pdfUrl?: string | null;
    sha256: string;
    createdAt: string;
  } | null>(null);
  const [quoteRef, setQuoteRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProjectArchive(project.id);
      setChecklist(data.dossier.readiness.checklist);
      setCanArchive(data.dossier.readiness.canArchive);
      setAlreadyArchived(data.dossier.readiness.alreadyArchived);
      setBundle(data.bundle);
      setQuoteRef(data.dossier.quote?.reference ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l’archive.");
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void load();
  }, [load, project.status, project.archivedAt]);

  async function handleArchive() {
    const ok = await confirm({
      title: "Archiver le dossier",
      message:
        "Le devis signé, les factures soldées et ce projet livré seront archivés. Les PDF restent consultables via S3. Cette action n’est pas réversible en v1.",
      confirmLabel: "Archiver",
    });
    if (!ok) return;

    setArchiving(true);
    setError("");
    try {
      const result = await archiveProjectApi(project.id);
      onArchived(result.project);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Archivage impossible.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Archive className="h-4 w-4 text-primary" aria-hidden />
            Clôture &amp; archive
          </h3>
          <p className="mt-1 text-xs text-gray-text">
            Archivez uniquement quand le projet est livré et les factures soldées.
            {quoteRef ? ` Devis lié : ${quoteRef}.` : ""}
          </p>
        </div>
        {alreadyArchived && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
            Archivé
          </span>
        )}
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-text">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Vérification…
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-text/50" aria-hidden />
              )}
              <div>
                <p className={cn("font-medium", item.ok ? "text-foreground" : "text-gray-text")}>
                  {item.label}
                </p>
                {item.detail ? (
                  <p className="text-xs text-gray-text">{item.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      {bundle && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bundle.pdfUrl ? (
            <a
              href={bundle.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary-light/30"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Manifeste PDF
            </a>
          ) : null}
          {bundle.manifestUrl ? (
            <a
              href={bundle.manifestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray/60 px-3 py-2 text-xs font-medium hover:bg-gray-light"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Manifeste JSON
            </a>
          ) : null}
          <p className="w-full text-[10px] text-gray-text">
            SHA256 {bundle.sha256.slice(0, 24)}… · {new Date(bundle.createdAt).toLocaleString("fr-FR")}
          </p>
        </div>
      )}

      {!alreadyArchived && (
        <button
          type="button"
          disabled={!canArchive || archiving || loading}
          onClick={() => void handleArchive()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {archiving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Archive className="h-4 w-4" aria-hidden />
          )}
          Archiver le dossier
        </button>
      )}

      <p className="mt-3 text-[11px] text-gray-text">
        Consultez tous les dossiers archivés dans{" "}
        <Link href="/admin/crm/archives" className="font-semibold text-primary hover:underline">
          Archives
        </Link>
        .
      </p>
    </section>
  );
}
