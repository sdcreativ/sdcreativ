/**
 * Lecture GitHub Actions / branches / déploiements pour le dashboard DevOps.
 * Runtime : `.env.docker` → DEVOPS_GITHUB_TOKEN (ou GITHUB_TOKEN) + GITHUB_REPOSITORY.
 * Aucune donnée factice : si non configuré, `configured: false`.
 */

export type DevopsPipelineStep = {
  name: string;
  status: "success" | "failure" | "cancelled" | "skipped" | "in_progress" | "queued" | "unknown";
  durationMs: number | null;
};

export type DevopsPipeline = {
  id: number;
  name: string;
  status: "success" | "failure" | "cancelled" | "in_progress" | "queued" | "unknown";
  conclusion: string | null;
  branch: string;
  event: string;
  htmlUrl: string;
  startedAt: string | null;
  updatedAt: string | null;
  steps: DevopsPipelineStep[];
};

export type DevopsDeployment = {
  environment: string;
  ref: string;
  sha: string;
  createdAt: string;
  htmlUrl: string | null;
  state: string;
};

export type DevopsBranch = {
  name: string;
  sha: string;
  protected: boolean;
  htmlUrl: string;
  updatedAt: string | null;
};

export type DevopsGithubSnapshot = {
  configured: boolean;
  hint?: string;
  repository: string | null;
  fetchedAt: string;
  pipeline: DevopsPipeline | null;
  deployments: DevopsDeployment[];
  branches: DevopsBranch[];
  error?: string;
};

type GhWorkflowRun = {
  id: number;
  name: string | null;
  display_title?: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  head_branch: string;
  event: string;
  created_at: string;
  updated_at: string;
  run_started_at?: string;
};

type GhJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps?: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
};

type GhBranch = {
  name: string;
  protected: boolean;
  commit: { sha: string; url?: string };
};

type GhDeployment = {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  created_at: string;
  url?: string;
  statuses_url?: string;
};

type GhDeploymentStatus = {
  state: string;
  environment?: string;
  created_at: string;
  target_url?: string | null;
  log_url?: string | null;
};

function getToken(): string | null {
  const token =
    process.env.DEVOPS_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    "";
  return token || null;
}

function getRepository(): string | null {
  const raw = process.env.GITHUB_REPOSITORY?.trim() || "";
  if (!raw) return null;
  if (!/^[\w.-]+\/[\w.-]+$/.test(raw)) return null;
  return raw;
}

function mapRunStatus(
  status: string,
  conclusion: string | null,
): DevopsPipeline["status"] {
  if (status === "in_progress" || status === "pending") return "in_progress";
  if (status === "queued" || status === "waiting" || status === "requested") return "queued";
  if (conclusion === "success") return "success";
  if (conclusion === "failure" || conclusion === "timed_out") return "failure";
  if (conclusion === "cancelled" || conclusion === "action_required") return "cancelled";
  return "unknown";
}

function mapStepStatus(
  status: string,
  conclusion: string | null,
): DevopsPipelineStep["status"] {
  if (status === "in_progress") return "in_progress";
  if (status === "queued" || status === "pending") return "queued";
  if (conclusion === "success") return "success";
  if (conclusion === "failure" || conclusion === "timed_out") return "failure";
  if (conclusion === "cancelled") return "cancelled";
  if (conclusion === "skipped" || conclusion === "neutral") return "skipped";
  return "unknown";
}

function durationMs(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const a = Date.parse(start);
  const b = Date.parse(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  return b - a;
}

async function ghFetch<T>(
  path: string,
  token: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sdcreativ-crm-devops",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: body.slice(0, 200) || res.statusText,
    };
  }
  return { ok: true, data: (await res.json()) as T };
}

async function fetchLatestPipeline(
  repo: string,
  token: string,
): Promise<DevopsPipeline | null> {
  const runsRes = await ghFetch<{ workflow_runs: GhWorkflowRun[] }>(
    `/repos/${repo}/actions/runs?per_page=1`,
    token,
  );
  if (!runsRes.ok || !runsRes.data.workflow_runs?.length) return null;

  const run = runsRes.data.workflow_runs[0]!;
  const jobsRes = await ghFetch<{ jobs: GhJob[] }>(
    `/repos/${repo}/actions/runs/${run.id}/jobs?per_page=20`,
    token,
  );

  const steps: DevopsPipelineStep[] = [];
  if (jobsRes.ok) {
    for (const job of jobsRes.data.jobs ?? []) {
      if (job.steps && job.steps.length > 0) {
        for (const step of job.steps) {
          if (step.conclusion === "skipped" && step.status === "completed") {
            // garder les skipped visibles pour coller à la réalité du run
          }
          steps.push({
            name: step.name,
            status: mapStepStatus(step.status, step.conclusion),
            durationMs: durationMs(step.started_at, step.completed_at),
          });
        }
      } else {
        steps.push({
          name: job.name,
          status: mapStepStatus(job.status, job.conclusion),
          durationMs: durationMs(job.started_at, job.completed_at),
        });
      }
    }
  }

  return {
    id: run.id,
    name: run.name || run.display_title || "Workflow",
    status: mapRunStatus(run.status, run.conclusion),
    conclusion: run.conclusion,
    branch: run.head_branch,
    event: run.event,
    htmlUrl: run.html_url,
    startedAt: run.run_started_at ?? run.created_at,
    updatedAt: run.updated_at,
    steps,
  };
}

async function fetchBranches(repo: string, token: string): Promise<DevopsBranch[]> {
  const res = await ghFetch<GhBranch[]>(
    `/repos/${repo}/branches?per_page=10`,
    token,
  );
  if (!res.ok) return [];

  const [owner, name] = repo.split("/");
  return res.data.map((b) => ({
    name: b.name,
    sha: b.commit.sha.slice(0, 7),
    protected: b.protected,
    htmlUrl: `https://github.com/${owner}/${name}/tree/${encodeURIComponent(b.name)}`,
    updatedAt: null,
  }));
}

async function fetchDeployments(
  repo: string,
  token: string,
): Promise<DevopsDeployment[]> {
  const res = await ghFetch<GhDeployment[]>(
    `/repos/${repo}/deployments?per_page=15`,
    token,
  );
  if (!res.ok) return [];

  const byEnv = new Map<string, DevopsDeployment>();

  for (const dep of res.data) {
    const envKey = dep.environment || "unknown";
    if (byEnv.has(envKey)) continue;

    let state = "unknown";
    let htmlUrl: string | null = null;
    if (dep.statuses_url) {
      const statusPath = dep.statuses_url.replace("https://api.github.com", "");
      const st = await ghFetch<GhDeploymentStatus[]>(`${statusPath}?per_page=1`, token);
      if (st.ok && st.data[0]) {
        state = st.data[0].state;
        htmlUrl = st.data[0].log_url || st.data[0].target_url || null;
      }
    }

    byEnv.set(envKey, {
      environment: envKey,
      ref: dep.ref,
      sha: dep.sha.slice(0, 7),
      createdAt: dep.created_at,
      htmlUrl,
      state,
    });

    if (byEnv.size >= 5) break;
  }

  return [...byEnv.values()];
}

/** Snapshot DevOps GitHub — jamais de données inventées. */
export async function getDevopsGithubSnapshot(): Promise<DevopsGithubSnapshot> {
  const fetchedAt = new Date().toISOString();
  const token = getToken();
  const repository = getRepository();

  if (!token || !repository) {
    return {
      configured: false,
      hint:
        "Ajoutez DEVOPS_GITHUB_TOKEN (ou GITHUB_TOKEN) et GITHUB_REPOSITORY=owner/repo dans .env.docker, puis redémarrez le conteneur app.",
      repository: repository,
      fetchedAt,
      pipeline: null,
      deployments: [],
      branches: [],
    };
  }

  try {
    const [pipeline, branches, deployments] = await Promise.all([
      fetchLatestPipeline(repository, token),
      fetchBranches(repository, token),
      fetchDeployments(repository, token),
    ]);

    return {
      configured: true,
      repository,
      fetchedAt,
      pipeline,
      deployments,
      branches,
    };
  } catch (error) {
    console.error("[devops-github]", error);
    return {
      configured: true,
      repository,
      fetchedAt,
      pipeline: null,
      deployments: [],
      branches: [],
      error: error instanceof Error ? error.message : "Erreur GitHub API.",
    };
  }
}
