"use client";

import { useEffect, useState } from "react";
import { PROJECT_TYPE_LABELS } from "@/content/projects-labels";
import { cn } from "@/lib/utils";
import { ChevronDown, FolderKanban } from "lucide-react";

type PortalProject = {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
};

type Props = {
  activeProjectId?: string | null;
  onProjectChange: (projectId: string) => void;
};

export function ClientPortalProjectSwitcher({ activeProjectId, onProjectChange }: Props) {
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/espace-client/projects", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { projects: [] }))
      .then((json: { projects?: PortalProject[] }) => setProjects(json.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  if (projects.length <= 1) return null;

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  return (
    <div className="relative border-b border-white/10 px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-left text-sm transition hover:bg-white/15"
      >
        <FolderKanban className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{active?.name}</p>
          <p className="truncate text-xs text-white/50">
            {active ? PROJECT_TYPE_LABELS[active.type as keyof typeof PROJECT_TYPE_LABELS] ?? active.type : ""}
            {" · "}{active?.progress ?? 0}%
          </p>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0c4a80] py-1 shadow-lg">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                onProjectChange(project.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-white/10",
                project.id === active?.id && "bg-white/15",
              )}
            >
              <span className="font-medium">{project.name}</span>
              <span className="text-xs text-white/50">{project.progress}% · {project.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
