"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MILESTONE_STATUS_LABELS, formatProjectDate } from "@/content/projects-labels";
import type { Project, ProjectMilestone } from "@/lib/projects";
import { fetchProjectMilestones } from "@/lib/projects-api";
import { cn } from "@/lib/utils";
import { CalendarClock, Loader2 } from "lucide-react";

type Props = {
  project: Project;
};

type TimelineItem = {
  id: string;
  label: string;
  date: Date;
  kind: "start" | "milestone" | "due";
  status?: string;
  pct: number;
};

export function ProjectGanttTimeline({ project }: Props) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchProjectMilestones(project.id)
      .then(setMilestones)
      .catch(() => setMilestones([]))
      .finally(() => setLoading(false));
  }, [project.id]);

  const items = useMemo(() => buildTimelineItems(project, milestones), [project, milestones]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 py-8 text-sm text-gray-text">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement de la timeline…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-gray/30 bg-gray-light/30 px-4 py-8 text-center text-sm text-gray-text">
        Définissez une date de début et de livraison pour afficher la timeline.
      </p>
    );
  }

  const todayPct = computeTodayPct(project);

  return (
    <div className="space-y-4">
      <div className="relative h-3 overflow-hidden rounded-full bg-gray-light">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/20"
          style={{ width: `${project.progress}%` }}
        />
        {todayPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-accent"
            style={{ left: `${todayPct}%` }}
            title="Aujourd'hui"
          />
        )}
      </div>

      <ol className="relative space-y-4 border-l-2 border-primary/20 pl-6">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <span
              className={cn(
                "absolute -left-[1.65rem] top-1 flex h-3 w-3 rounded-full border-2 border-white",
                item.kind === "start" && "bg-sky-500",
                item.kind === "due" && "bg-accent",
                item.kind === "milestone" && item.status === "done" && "bg-emerald-500",
                item.kind === "milestone" && item.status === "current" && "bg-primary",
                item.kind === "milestone" && item.status === "upcoming" && "bg-gray-text/40",
              )}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <time className="text-xs text-gray-text">
                {item.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </div>
            {item.status && (
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-text">
                {MILESTONE_STATUS_LABELS[item.status as keyof typeof MILESTONE_STATUS_LABELS] ?? item.status}
              </p>
            )}
          </li>
        ))}
      </ol>

      <p className="text-xs text-gray-text">
        Avancement actuel : {project.progress} % · Livraison prévue {formatProjectDate(project.dueDate)}
      </p>
    </div>
  );
}

export function ProjectsGanttOverview({ projects }: { projects: Project[] }) {
  const withDates = projects.filter((p) => p.startDate || p.dueDate);
  if (withDates.length === 0) {
    return (
      <p className="rounded-2xl border border-gray/40 bg-white p-12 text-center text-sm text-gray-text">
        Aucun projet avec dates planifiées.
      </p>
    );
  }

  const bounds = computeGlobalBounds(withDates);

  return (
    <div className="space-y-3 rounded-2xl border border-gray/40 bg-white p-5 shadow-sm">
      <p className="text-xs text-gray-text">{bounds.label} — barres proportionnelles à la durée planifiée</p>
      <ul className="space-y-3">
        {withDates.map((project) => {
          const start = project.startDate ? new Date(project.startDate) : bounds.min;
          const end = project.dueDate ? new Date(project.dueDate) : new Date(start.getTime() + 7 * 86400000);
          const left = ((start.getTime() - bounds.min.getTime()) / bounds.span) * 100;
          const width = Math.max(4, ((end.getTime() - start.getTime()) / bounds.span) * 100);
          return (
            <li key={project.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <Link href={`/admin/crm/projets/${project.id}`} className="font-semibold text-foreground hover:text-primary">
                  {project.name}
                </Link>
                <span className="text-xs text-gray-text">{project.progress} %</span>
              </div>
              <div className="relative h-6 overflow-hidden rounded-lg bg-gray-light">
                <div
                  className="absolute inset-y-0 rounded-lg bg-primary/80"
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
                <div
                  className="absolute inset-y-0 rounded-l-lg bg-primary"
                  style={{ left: `${left}%`, width: `${(width * project.progress) / 100}%`, maxWidth: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ProjectCalendarLink({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<string | null>(null);

  useEffect(() => {
    void import("@/lib/projects-api")
      .then(({ fetchProjectNextEvent }) => fetchProjectNextEvent(projectId))
      .then((event) => {
        if (event) {
          setTitle(event.title);
          setStartsAt(event.startsAt);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return null;
  if (!title || !startsAt) {
    return (
      <Link
        href={`/admin/crm/calendrier?project=${projectId}`}
        className="inline-flex items-center gap-2 rounded-xl border border-gray/40 bg-gray-light/30 px-3 py-2 text-sm text-gray-text hover:text-foreground"
      >
        <CalendarClock className="h-4 w-4" aria-hidden />
        Planifier une réunion
      </Link>
    );
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));

  return (
    <Link
      href={`/admin/crm/calendrier?project=${projectId}`}
      className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-light/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary-light/40"
    >
      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        Prochaine réunion : <strong>{title}</strong> — {dateLabel}
      </span>
    </Link>
  );
}

function buildTimelineItems(project: Project, milestones: ProjectMilestone[]): TimelineItem[] {
  const start = project.startDate ? new Date(project.startDate) : null;
  const end = project.dueDate ? new Date(project.dueDate) : null;
  if (!start && !end) return [];

  const rangeStart = start ?? end!;
  const rangeEnd = end ?? start!;
  const span = Math.max(rangeEnd.getTime() - rangeStart.getTime(), 86400000);

  const items: TimelineItem[] = [];
  if (start) {
    items.push({ id: "start", label: "Début du projet", date: start, kind: "start", pct: 0 });
  }

  milestones.forEach((m, i) => {
    const ratio = milestones.length > 1 ? i / (milestones.length - 1) : 0.5;
    const date = new Date(rangeStart.getTime() + span * ratio);
    items.push({
      id: m.id,
      label: m.label,
      date,
      kind: "milestone",
      status: m.status,
      pct: ratio * 100,
    });
  });

  if (end) {
    items.push({ id: "due", label: "Livraison", date: end, kind: "due", pct: 100 });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function computeTodayPct(project: Project): number | null {
  if (!project.startDate || !project.dueDate) return null;
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.dueDate).getTime();
  const now = Date.now();
  if (now < start || now > end) return null;
  return ((now - start) / (end - start)) * 100;
}

function computeGlobalBounds(projects: Project[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const p of projects) {
    if (p.startDate) min = Math.min(min, new Date(p.startDate).getTime());
    if (p.dueDate) max = Math.max(max, new Date(p.dueDate).getTime());
  }
  if (min === Infinity) min = Date.now();
  if (max === -Infinity) max = min + 30 * 86400000;
  const minDate = new Date(min);
  const maxDate = new Date(max);
  return {
    min: minDate,
    max: maxDate,
    span: Math.max(max - min, 86400000),
    label: `${minDate.toLocaleDateString("fr-FR")} → ${maxDate.toLocaleDateString("fr-FR")}`,
  };
}
