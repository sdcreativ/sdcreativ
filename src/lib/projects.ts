import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import { getProjectStepsFromProgress } from "@/lib/client-portal-utils";
import type { MilestoneStatus, ProjectStatus, ProjectType } from "@/content/projects-labels";
import {
  DEFAULT_MILESTONE_LABELS,
  MILESTONE_STATUSES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  statusToProgress,
} from "@/content/projects-labels";

export type Project = {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string | null;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  budget: number | null;
  description: string | null;
  assignee: string | null;
  metadata: Record<string, unknown>;
  milestoneCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMilestone = {
  id: string;
  projectId: string;
  label: string;
  sortOrder: number;
  status: MilestoneStatus;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
};

type ProjectRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_company: string | null;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  progress: number;
  start_date: Date | null;
  due_date: Date | null;
  budget: number | null;
  description: string | null;
  assignee: string | null;
  metadata: Record<string, unknown> | null;
  milestone_count?: string;
  created_at: Date;
  updated_at: Date;
};

type MilestoneRow = {
  id: string;
  project_id: string;
  label: string;
  sort_order: number;
  status: MilestoneStatus;
  completed_at: Date | null;
  notes: string | null;
  created_at: Date;
};

const projectSelect = `
  SELECT p.*,
    c.name AS client_name,
    c.company AS client_company,
    COUNT(m.id)::text AS milestone_count
  FROM projects p
  JOIN clients c ON c.id = p.client_id
  LEFT JOIN project_milestones m ON m.project_id = p.id
`;

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    clientCompany: row.client_company,
    name: row.name,
    type: row.type,
    status: row.status,
    progress: row.progress,
    startDate: row.start_date ? row.start_date.toISOString().slice(0, 10) : null,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
    budget: row.budget,
    description: row.description,
    assignee: row.assignee ?? null,
    metadata: row.metadata ?? {},
    milestoneCount: Number(row.milestone_count ?? 0),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapMilestone(row: MilestoneRow): ProjectMilestone {
  return {
    id: row.id,
    projectId: row.project_id,
    label: row.label,
    sortOrder: row.sort_order,
    status: row.status,
    completedAt: row.completed_at?.toISOString() ?? null,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
  };
}

export const createProjectSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  type: z.enum(PROJECT_TYPES).default("site_vitrine"),
  status: z.enum(PROJECT_STATUSES).default("discovery"),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  budget: z.number().int().min(0).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  assignee: z.string().trim().max(100).optional().nullable(),
  seedMilestones: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().omit({ seedMilestones: true });

export const createMilestoneSchema = z.object({
  label: z.string().trim().min(1).max(200),
  sortOrder: z.number().int().min(0).max(99).optional(),
  status: z.enum(MILESTONE_STATUSES).default("upcoming"),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

async function seedDefaultMilestones(
  query: (text: string, params?: unknown[]) => Promise<{ rows: MilestoneRow[]; rowCount: number | null }>,
  projectId: string,
  status: ProjectStatus,
): Promise<void> {
  const statusIndex: Record<ProjectStatus, number> = {
    discovery: 0,
    design: 1,
    development: 2,
    testing: 3,
    delivered: 4,
    on_hold: 0,
    cancelled: 0,
  };
  const currentIdx = statusIndex[status];

  for (let i = 0; i < DEFAULT_MILESTONE_LABELS.length; i++) {
    let milestoneStatus: MilestoneStatus = "upcoming";
    if (i < currentIdx) milestoneStatus = "done";
    else if (i === currentIdx) milestoneStatus = "current";

    await query(
      `INSERT INTO project_milestones (project_id, label, sort_order, status, completed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        projectId,
        DEFAULT_MILESTONE_LABELS[i],
        i,
        milestoneStatus,
        milestoneStatus === "done" ? new Date() : null,
      ],
    );
  }
}

type DbQuery = (
  text: string,
  params?: unknown[],
) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>;

async function syncMilestonesToProgressQuery(
  query: DbQuery,
  projectId: string,
  progress: number,
): Promise<void> {
  const { rows } = await query(
    `SELECT id, sort_order, completed_at FROM project_milestones WHERE project_id = $1 ORDER BY sort_order ASC`,
    [projectId],
  );
  if (rows.length === 0) return;

  const steps = getProjectStepsFromProgress(progress);
  for (let i = 0; i < rows.length; i++) {
    const milestone = rows[i] as { id: string; completed_at: Date | null };
    const step = steps[i];
    if (!step) continue;

    const completedAt =
      step.status === "done"
        ? milestone.completed_at ?? new Date()
        : null;

    await query(
      `UPDATE project_milestones SET status = $2, completed_at = $3 WHERE id = $1`,
      [milestone.id, step.status, completedAt],
    );
  }
}

/** Aligne les jalons CRM sur la progression admin (Kanban / fiche projet). */
export async function syncProjectMilestonesToProgress(
  projectId: string,
  progress: number,
): Promise<void> {
  await withDb(async (query) => syncMilestonesToProgressQuery(query, projectId, progress));
}

export async function listProjects(status?: ProjectStatus): Promise<Project[]> {
  const result = await listProjectsPaginated(status ? { status, pageSize: 10_000 } : { pageSize: 10_000 });
  return result.projects;
}

export type ProjectListFilters = {
  status?: ProjectStatus;
  assignee?: string;
  clientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export type ProjectListResult = {
  projects: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listProjectsPaginated(filters: ProjectListFilters = {}): Promise<ProjectListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  return withDb(async (query) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.status) {
      conditions.push(`p.status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.assignee) {
      if (filters.assignee === "__unassigned__") {
        conditions.push(`(p.assignee IS NULL OR TRIM(p.assignee) = '')`);
      } else {
        conditions.push(`p.assignee = $${idx++}`);
        params.push(filters.assignee);
      }
    }
    if (filters.clientId) {
      conditions.push(`p.client_id = $${idx++}`);
      params.push(filters.clientId);
    }
    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim().replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(`(p.name ILIKE $${idx} OR c.name ILIKE $${idx} OR c.company ILIKE $${idx})`);
      params.push(pattern);
      idx += 1;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT p.id)::text AS count
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const { rows } = await query<ProjectRow>(
      `${projectSelect} ${where} GROUP BY p.id, c.name, c.company ORDER BY p.updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, pageSize, offset],
    );

    return {
      projects: rows.map(mapProject),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  return withDb(async (query) => {
    const { rows } = await query<ProjectRow>(
      `${projectSelect} WHERE p.id = $1 GROUP BY p.id, c.name, c.company`,
      [id],
    );
    return rows[0] ? mapProject(rows[0]) : null;
  });
}

/** Projet actif le plus récent pour un compte portail (slug). */
export async function getPrimaryProjectByPortalClientId(
  portalClientId: string,
): Promise<Project | null> {
  const projects = await listProjectsByPortalClientId(portalClientId);
  return projects[0] ?? null;
}

/** Tous les projets actifs d'un compte portail, du plus récent au plus ancien. */
export async function listProjectsByPortalClientId(
  portalClientId: string,
): Promise<Project[]> {
  return withDb(async (query) => {
    const { rows } = await query<ProjectRow>(
      `${projectSelect}
       WHERE c.portal_client_id = $1
         AND p.status NOT IN ('cancelled')
       GROUP BY p.id, c.name, c.company
       ORDER BY p.updated_at DESC`,
      [portalClientId],
    );
    return rows.map(mapProject);
  });
}

export async function getPortalProjectById(
  portalClientId: string,
  projectId: string,
): Promise<Project | null> {
  return withDb(async (query) => {
    const { rows } = await query<ProjectRow>(
      `${projectSelect}
       WHERE c.portal_client_id = $1 AND p.id = $2
         AND p.status NOT IN ('cancelled')
       GROUP BY p.id, c.name, c.company`,
      [portalClientId, projectId],
    );
    return rows[0] ? mapProject(rows[0]) : null;
  });
}

export async function createProject(
  input: z.infer<typeof createProjectSchema>,
): Promise<Project> {
  return withDb(async (query) => {
    const status = input.status ?? "discovery";
    const progress = input.progress ?? statusToProgress(status);

    const { rows } = await query<ProjectRow>(
      `INSERT INTO projects (
        client_id, name, type, status, progress,
        start_date, due_date, budget, description, assignee, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        input.clientId,
        input.name,
        input.type ?? "site_vitrine",
        status,
        progress,
        input.startDate ?? null,
        input.dueDate ?? null,
        input.budget ?? null,
        input.description ?? null,
        input.assignee ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );

    const projectId = rows[0].id;

    if (input.seedMilestones !== false) {
      await seedDefaultMilestones(query, projectId, status);
    }

    const full = await getProjectById(projectId);
    return full!;
  });
}

export async function updateProject(
  id: string,
  input: z.infer<typeof updateProjectSchema>,
): Promise<Project | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<ProjectRow>(
      `SELECT * FROM projects WHERE id = $1`,
      [id],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextStatus = input.status ?? existing.status;
    const nextProgress =
      input.progress !== undefined
        ? input.progress
        : input.status !== undefined
          ? statusToProgress(nextStatus)
          : existing.progress;

    await query(
      `UPDATE projects SET
        client_id = $2,
        name = $3,
        type = $4,
        status = $5,
        progress = $6,
        start_date = $7,
        due_date = $8,
        budget = $9,
        description = $10,
        assignee = $11,
        metadata = $12::jsonb,
        updated_at = NOW()
      WHERE id = $1`,
      [
        id,
        input.clientId ?? existing.client_id,
        input.name ?? existing.name,
        input.type ?? existing.type,
        nextStatus,
        nextProgress,
        input.startDate !== undefined ? input.startDate : existing.start_date,
        input.dueDate !== undefined ? input.dueDate : existing.due_date,
        input.budget !== undefined ? input.budget : existing.budget,
        input.description !== undefined ? input.description : existing.description,
        input.assignee !== undefined ? input.assignee : existing.assignee,
        JSON.stringify(
          input.metadata
            ? { ...(existing.metadata ?? {}), ...input.metadata }
            : existing.metadata ?? {},
        ),
      ],
    );

    await syncMilestonesToProgressQuery(query, id, nextProgress);

    return getProjectById(id);
  });
}

export async function deleteProject(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM projects WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}

export async function listProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
  return withDb(async (query) => {
    const { rows } = await query<MilestoneRow>(
      `SELECT * FROM project_milestones WHERE project_id = $1 ORDER BY sort_order ASC`,
      [projectId],
    );
    return rows.map(mapMilestone);
  });
}

export async function addProjectMilestone(
  projectId: string,
  input: z.infer<typeof createMilestoneSchema>,
): Promise<ProjectMilestone> {
  return withDb(async (query) => {
    const { rows: orderRows } = await query<{ max: number | null }>(
      `SELECT MAX(sort_order) AS max FROM project_milestones WHERE project_id = $1`,
      [projectId],
    );
    const sortOrder = input.sortOrder ?? (orderRows[0]?.max ?? -1) + 1;

    const { rows } = await query<MilestoneRow>(
      `INSERT INTO project_milestones (project_id, label, sort_order, status, notes, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        projectId,
        input.label,
        sortOrder,
        input.status ?? "upcoming",
        input.notes ?? null,
        input.status === "done" ? new Date() : null,
      ],
    );

    await query(`UPDATE projects SET updated_at = NOW() WHERE id = $1`, [projectId]);
    return mapMilestone(rows[0]);
  });
}

export async function updateProjectMilestone(
  milestoneId: string,
  input: z.infer<typeof updateMilestoneSchema>,
): Promise<ProjectMilestone | null> {
  return withDb(async (query) => {
    const { rows: existingRows } = await query<MilestoneRow>(
      `SELECT * FROM project_milestones WHERE id = $1`,
      [milestoneId],
    );
    const existing = existingRows[0];
    if (!existing) return null;

    const nextStatus = input.status ?? existing.status;
    const completedAt =
      nextStatus === "done"
        ? existing.completed_at ?? new Date()
        : nextStatus === "upcoming"
          ? null
          : existing.completed_at;

    const { rows } = await query<MilestoneRow>(
      `UPDATE project_milestones SET
        label = $2,
        sort_order = $3,
        status = $4,
        notes = $5,
        completed_at = $6
      WHERE id = $1
      RETURNING *`,
      [
        milestoneId,
        input.label ?? existing.label,
        input.sortOrder ?? existing.sort_order,
        nextStatus,
        input.notes !== undefined ? input.notes : existing.notes,
        completedAt,
      ],
    );

    await query(`UPDATE projects SET updated_at = NOW() WHERE id = $1`, [existing.project_id]);
    return mapMilestone(rows[0]);
  });
}

export async function deleteProjectMilestone(milestoneId: string): Promise<boolean> {
  return withDb(async (query) => {
    const { rowCount } = await query(`DELETE FROM project_milestones WHERE id = $1`, [milestoneId]);
    return (rowCount ?? 0) > 0;
  });
}
