"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectDetailContent } from "@/components/admin/ProjectDetailContent";
import type { Project } from "@/lib/projects";
import { deleteProjectApi, fetchProjectById } from "@/lib/projects-api";
import { useDialog } from "@/components/ui/DialogProvider";
import { ArrowLeft, Copy, Loader2, Trash2 } from "lucide-react";

type Props = {
  projectId: string;
};

export function ProjectDetailPage({ projectId }: Props) {
  const { confirm } = useDialog();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/admin/crm/projets/${projectId}`
      : `/admin/crm/projets/${projectId}`;

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProject(await fetchProjectById(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Projet introuvable.");
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete() {
    if (!project) return;
    const ok = await confirm({
      title: "Supprimer le projet",
      message: "Supprimer ce projet et tous ses jalons ?",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    setSaving(true);
    try {
      await deleteProjectApi(project.id);
      router.push("/admin/crm/projets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-gray-text">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        Chargement du projet…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <p className="text-accent">{error || "Projet introuvable."}</p>
        <Link href="/admin/crm/projets" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
          ← Retour aux projets
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/crm/projets"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Retour au kanban
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copyShareUrl()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray/60 px-3 py-2 text-sm font-medium text-gray-text hover:text-foreground"
          >
            <Copy className="h-4 w-4" aria-hidden />
            {copied ? "Copié !" : "Copier l'URL"}
          </button>
          {!project.archivedAt && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent hover:bg-accent/5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Supprimer
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray/30 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
        <p className="mt-1 text-sm text-gray-text">
          {project.clientCompany || project.clientName}
          {project.assignee ? ` · ${project.assignee}` : ""}
        </p>

        <div className="mt-6">
          <ProjectDetailContent
            project={project}
            saving={saving}
            onUpdated={setProject}
          />
        </div>
      </div>
    </div>
  );
}
