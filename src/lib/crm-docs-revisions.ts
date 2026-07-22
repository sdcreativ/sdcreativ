import type { CrmDocPageRecord, CrmDocPageStatus } from "@/lib/crm-docs-types";
import { updateCrmDocPage } from "@/lib/crm-docs";
import { isDatabaseConfigured, withDb } from "@/lib/db";

const MAX_REVISIONS_PER_PAGE = 30;

export type CrmDocRevisionSnapshot = {
  slug: string;
  title: string;
  categorySlug: string;
  summary: string;
  explanation: string;
  howItWorks: string;
  contentHtml: string;
  href: string | null;
  screenshots: string[];
  videoUrl: string | null;
  titleEn: string;
  summaryEn: string;
  explanationEn: string;
  howItWorksEn: string;
  contentHtmlEn: string;
  isRecent: boolean;
  status: CrmDocPageStatus;
  sortOrder: number;
  reviewedAt: string | null;
};

export type CrmDocRevisionRecord = {
  id: string;
  pageId: string;
  snapshot: CrmDocRevisionSnapshot;
  createdByName: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

type RevisionRow = {
  id: string;
  page_id: string;
  snapshot: CrmDocRevisionSnapshot;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: Date;
};

function mapRow(row: RevisionRow): CrmDocRevisionRecord {
  return {
    id: row.id,
    pageId: row.page_id,
    snapshot: row.snapshot,
    createdByName: row.created_by_name,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at.toISOString(),
  };
}

export function snapshotFromCrmDocPage(record: CrmDocPageRecord): CrmDocRevisionSnapshot {
  return {
    slug: record.slug,
    title: record.title,
    categorySlug: record.categorySlug,
    summary: record.summary,
    explanation: record.explanation,
    howItWorks: record.howItWorks,
    contentHtml: record.contentHtml,
    href: record.href,
    screenshots: record.screenshots ?? [],
    videoUrl: record.videoUrl,
    titleEn: record.titleEn,
    summaryEn: record.summaryEn,
    explanationEn: record.explanationEn,
    howItWorksEn: record.howItWorksEn,
    contentHtmlEn: record.contentHtmlEn,
    isRecent: record.isRecent,
    status: record.status,
    sortOrder: record.sortOrder,
    reviewedAt: record.reviewedAt,
  };
}

function snapshotsEqual(a: CrmDocRevisionSnapshot, b: CrmDocRevisionSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function saveCrmDocRevision(
  record: CrmDocPageRecord,
  author?: { name?: string | null; email?: string | null },
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const snapshot = snapshotFromCrmDocPage(record);

  await withDb(async (query) => {
    const { rows } = await query<RevisionRow>(
      `SELECT * FROM crm_doc_page_revisions
       WHERE page_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [record.id],
    );
    const latest = rows[0];
    if (latest && snapshotsEqual(latest.snapshot, snapshot)) return;

    await query(
      `INSERT INTO crm_doc_page_revisions (page_id, snapshot, created_by_name, created_by_email)
       VALUES ($1, $2::jsonb, $3, $4)`,
      [record.id, JSON.stringify(snapshot), author?.name ?? null, author?.email ?? null],
    );

    await query(
      `DELETE FROM crm_doc_page_revisions
       WHERE page_id = $1
         AND id NOT IN (
           SELECT id FROM crm_doc_page_revisions
           WHERE page_id = $1
           ORDER BY created_at DESC
           LIMIT $2
         )`,
      [record.id, MAX_REVISIONS_PER_PAGE],
    );
  });
}

export async function listCrmDocRevisions(
  pageId: string,
  limit = 20,
): Promise<CrmDocRevisionRecord[]> {
  if (!isDatabaseConfigured()) return [];
  return withDb(async (query) => {
    const { rows } = await query<RevisionRow>(
      `SELECT * FROM crm_doc_page_revisions
       WHERE page_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [pageId, limit],
    );
    return rows.map(mapRow);
  });
}

export async function restoreCrmDocRevision(
  pageId: string,
  revisionId: string,
  author?: { name?: string | null; email?: string | null },
): Promise<CrmDocPageRecord | null> {
  const { getCrmDocPageById } = await import("@/lib/crm-docs");
  const existing = await getCrmDocPageById(pageId);
  if (!existing) return null;

  const revision = await withDb(async (query) => {
    const { rows } = await query<RevisionRow>(
      `SELECT * FROM crm_doc_page_revisions WHERE id = $1 AND page_id = $2 LIMIT 1`,
      [revisionId, pageId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  });
  if (!revision) return null;

  await saveCrmDocRevision(existing, author);
  const s = revision.snapshot;
  return updateCrmDocPage(
    pageId,
    {
      slug: s.slug,
      title: s.title,
      categorySlug: s.categorySlug,
      summary: s.summary,
      explanation: s.explanation,
      howItWorks: s.howItWorks,
      contentHtml: s.contentHtml,
      href: s.href,
      screenshots: s.screenshots,
      videoUrl: s.videoUrl ?? null,
      titleEn: s.titleEn ?? "",
      summaryEn: s.summaryEn ?? "",
      explanationEn: s.explanationEn ?? "",
      howItWorksEn: s.howItWorksEn ?? "",
      contentHtmlEn: s.contentHtmlEn ?? "",
      isRecent: s.isRecent,
      status: s.status,
      sortOrder: s.sortOrder,
      reviewedAt: s.reviewedAt,
    },
    { skipRevision: true },
  );
}
