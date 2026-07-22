import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { listCrmDocCategories } from "@/lib/crm-docs-categories";
import { listCrmDocPages } from "@/lib/crm-docs";
import { CRM_DOC_CATEGORIES, CRM_DOC_FEATURES } from "@/content/crm-docs/catalog";
import { crmDocPageExtrasDefaults } from "@/lib/crm-docs-defaults";
import { resolveCrmDocScreenshotSrc } from "@/lib/crm-docs-screenshot-url";

const execFileAsync = promisify(execFile);

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://sdcreativ.com";
const RAW_IMG =
  process.env.CRM_WIKI_RAW_IMG_BASE?.replace(/\/$/, "") ||
  "https://raw.githubusercontent.com/sdcreativ/sdcreativ/main/public/crm-docs";

function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function wikiImageUrl(shot: string): string {
  const src = resolveCrmDocScreenshotSrc(shot);
  if (src.startsWith("http")) return src;
  if (src.startsWith("/crm-docs/")) {
    return `${RAW_IMG}/${src.slice("/crm-docs/".length)}`;
  }
  return `${SITE}${src}`;
}

function renderFeature(f: {
  title: string;
  summary: string;
  explanation: string;
  howItWorks: string;
  href?: string | null;
  screenshots?: string[];
}): string {
  const lines: string[] = [];
  lines.push(`### ${f.title}`);
  lines.push("");
  if (f.summary) lines.push(f.summary, "");
  if (f.explanation) {
    lines.push("**Explication**", "", f.explanation, "");
  }
  if (f.howItWorks) {
    lines.push("**Fonctionnement**", "", f.howItWorks, "");
  }
  if (f.href) lines.push(`[Ouvrir dans le CRM](${SITE}${f.href.startsWith("/") ? f.href : `/${f.href}`})`, "");
  for (const shot of f.screenshots ?? []) {
    lines.push(`![${f.title}](${wikiImageUrl(shot)})`, "");
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function isCrmWikiPublishEnabled(): boolean {
  return process.env.CRM_WIKI_PUBLISH_ENABLED === "1";
}

export function getCrmWikiGitUrl(): string | null {
  return process.env.CRM_WIKI_GIT_URL?.trim() || null;
}

/** Génère le dossier `wiki/` depuis la DB (fallback catalogue). */
export async function generateCrmWikiFiles(): Promise<{
  pages: number;
  categories: number;
  outDir: string;
  source: "db" | "catalog";
}> {
  const outDir = path.join(process.cwd(), "wiki");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  let categories = await listCrmDocCategories();
  let pages = (await listCrmDocPages({ status: "published" })).filter((p) => !p.deletedAt);
  let source: "db" | "catalog" = "db";

  if (pages.length === 0) {
    source = "catalog";
    categories = CRM_DOC_CATEGORIES.map((c, i) => ({
      id: c.id,
      slug: c.id,
      label: c.label,
      description: c.description,
      sortOrder: i,
      createdAt: "",
      updatedAt: "",
    }));
    pages = CRM_DOC_FEATURES.map((f) => ({
      id: f.id,
      slug: f.id,
      title: f.title,
      categorySlug: f.category,
      summary: f.summary,
      explanation: f.explanation,
      howItWorks: f.howItWorks,
      contentHtml: "",
      href: f.href ?? null,
      screenshots: f.screenshots ?? [],
      ...crmDocPageExtrasDefaults(),
      isRecent: Boolean(f.recent),
      status: "published" as const,
      sortOrder: 0,
      reviewedAt: null,
      deletedAt: null,
      createdAt: "",
      updatedAt: "",
    }));
  }

  const sidebar: string[] = ["## Documentation CRM", ""];
  sidebar.push("- [Accueil](Home)");
  for (const cat of categories) {
    sidebar.push(`- [${cat.label}](${slugify(cat.label)})`);
  }
  sidebar.push("");
  sidebar.push("- [Nouveautés](Nouveautes)");
  sidebar.push(`- [Doc dans le CRM](${SITE}/admin/crm/documentation)`);
  await writeFile(path.join(outDir, "_Sidebar.md"), `${sidebar.join("\n")}\n`);

  const home: string[] = [];
  home.push("# Wiki CRM SD CREATIV", "");
  home.push(
    "Documentation interne des fonctionnalités : explication, fonctionnement, liens et captures.",
    "",
  );
  home.push(
    `> Consultation interactive aussi dans le CRM : [Admin → Documentation](${SITE}/admin/crm/documentation).`,
    "",
  );
  home.push(`**${pages.length} fiches** · **${categories.length} catégories**`, "");
  home.push("## Sommaire", "");
  for (const cat of categories) {
    const page = slugify(cat.label);
    const count = pages.filter((f) => f.categorySlug === cat.slug).length;
    home.push(`- [[${cat.label}|${page}]] — ${cat.description} (${count})`);
  }
  home.push("");
  home.push("## Nouveautés", "");
  const recent = pages.filter((f) => f.isRecent);
  for (const f of recent) {
    const cat = categories.find((c) => c.slug === f.categorySlug);
    home.push(`- **${f.title}** → [[${cat?.label ?? f.categorySlug}|${slugify(cat?.label ?? f.categorySlug)}]]`);
  }
  home.push("");
  home.push("---", "");
  home.push(
    `_Généré automatiquement depuis le CMS CRM (${source}) via « Publier le wiki »._`,
  );
  await writeFile(path.join(outDir, "Home.md"), `${home.join("\n")}\n`);

  const nouveautes: string[] = ["# Nouveautés", "", "Fonctionnalités marquées récentes.", ""];
  for (const f of recent) {
    nouveautes.push(
      renderFeature({
        title: f.title,
        summary: f.summary,
        explanation: f.explanation,
        howItWorks: f.howItWorks,
        href: f.href,
        screenshots: f.screenshots,
      }),
    );
  }
  await writeFile(path.join(outDir, "Nouveautes.md"), `${nouveautes.join("\n")}\n`);

  for (const cat of categories) {
    const page = slugify(cat.label);
    const catFeatures = pages.filter((f) => f.categorySlug === cat.slug);
    const lines: string[] = [`# ${cat.label}`, "", cat.description, "", "[[← Accueil|Home]]", ""];
    for (const f of catFeatures) {
      lines.push(
        renderFeature({
          title: f.title,
          summary: f.summary,
          explanation: f.explanation,
          howItWorks: f.howItWorks,
          href: f.href,
          screenshots: f.screenshots,
        }),
      );
    }
    await writeFile(path.join(outDir, `${page}.md`), `${lines.join("\n")}\n`);
  }

  await writeFile(
    path.join(outDir, "README.md"),
    `# Wiki CRM SD CREATIV

Généré depuis le CRM (source de vérité : fiches publiées en base).

Pour republier : Admin → Documentation → « Publier le wiki ».
`,
  );

  return { pages: pages.length, categories: categories.length, outDir, source };
}

export async function publishCrmWiki(): Promise<{
  generated: Awaited<ReturnType<typeof generateCrmWikiFiles>>;
  pushed: boolean;
  commitMessage: string;
}> {
  if (!isCrmWikiPublishEnabled()) {
    throw new Error(
      "Publication wiki désactivée. Définissez CRM_WIKI_PUBLISH_ENABLED=1 dans .env.docker.",
    );
  }
  const gitUrl = getCrmWikiGitUrl();
  if (!gitUrl) {
    throw new Error(
      "CRM_WIKI_GIT_URL manquant (ex. https://x-access-token:TOKEN@github.com/org/repo.wiki.git).",
    );
  }

  const generated = await generateCrmWikiFiles();
  const tmpDir = path.join("/tmp", `sdcreativ-wiki-${Date.now()}`);
  const commitMessage = `docs: sync wiki CRM ${new Date().toISOString().slice(0, 10)}`;

  try {
    await execFileAsync("git", ["clone", "--depth", "1", gitUrl, tmpDir], {
      timeout: 120_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

    await execFileAsync(
      "rsync",
      ["-a", "--delete", "--exclude", ".git", `${generated.outDir}/`, `${tmpDir}/`],
      { timeout: 60_000 },
    );

    await execFileAsync("git", ["-C", tmpDir, "config", "user.email", "crm@sdcreativ.com"]);
    await execFileAsync("git", ["-C", tmpDir, "config", "user.name", "SD CREATIV CRM"]);
    await execFileAsync("git", ["-C", tmpDir, "add", "-A"]);

    try {
      await execFileAsync("git", ["-C", tmpDir, "diff", "--cached", "--quiet"]);
      // no changes
      return { generated, pushed: false, commitMessage };
    } catch {
      // diff --quiet exits 1 when there are changes — expected
    }

    await execFileAsync("git", ["-C", tmpDir, "commit", "-m", commitMessage]);
    await execFileAsync("git", ["-C", tmpDir, "push", "origin", "HEAD"], {
      timeout: 120_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });

    return { generated, pushed: true, commitMessage };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
