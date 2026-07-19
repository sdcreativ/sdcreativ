import { createHash } from "node:crypto";
import { withDb } from "@/lib/db";
import { getClientById } from "@/lib/clients";
import {
  getLatestBillingDocument,
  getLatestInvoiceBillingDocument,
  listBillingDocumentsForQuote,
} from "@/lib/billing/documents";
import { logBillingEvent } from "@/lib/billing/events";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { logCrmAudit } from "@/lib/crm-audit";
import type { Invoice } from "@/lib/invoices";
import { getProjectById, type Project } from "@/lib/projects";
import {
  evaluateArchiveReadiness,
  type ArchiveReadiness,
} from "@/lib/projects/archive-readiness";
import { getQuoteById, type Quote } from "@/lib/quotes";
import {
  buildProjectDocumentKey,
  createPresignedDownloadUrl,
  isS3Configured,
  listProjectDocuments,
  uploadObjectBuffer,
} from "@/lib/s3";

export class ArchiveWorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchiveWorkflowError";
  }
}

export type ProjectDossier = {
  project: Project;
  quote: Quote | null;
  invoices: Invoice[];
  readiness: ArchiveReadiness;
};

export type ProjectArchiveBundle = {
  id: string;
  projectId: string;
  s3KeyManifest: string;
  s3KeyPdf: string | null;
  sha256: string;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  createdAt: string;
  manifestUrl?: string | null;
  pdfUrl?: string | null;
};

type BundleRow = {
  id: string;
  project_id: string;
  s3_key_manifest: string;
  s3_key_pdf: string | null;
  sha256: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: Date;
};

function mapBundle(row: BundleRow): ProjectArchiveBundle {
  return {
    id: row.id,
    projectId: row.project_id,
    s3KeyManifest: row.s3_key_manifest,
    s3KeyPdf: row.s3_key_pdf,
    sha256: row.sha256,
    metadata: row.metadata ?? {},
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

export async function resolveProjectDossier(projectId: string): Promise<ProjectDossier> {
  const project = await getProjectById(projectId);
  if (!project) throw new ArchiveWorkflowError("Projet introuvable.");

  let quote: Quote | null = null;
  if (project.sourceQuoteId) {
    quote = await getQuoteById(project.sourceQuoteId);
  }
  if (!quote) {
    quote = await withDb(async (query) => {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM quotes
         WHERE project_id = $1 OR (client_id = $2 AND project_id IS NULL)
         ORDER BY
           CASE WHEN project_id = $1 THEN 0 ELSE 1 END,
           CASE WHEN status IN ('signed','accepted','validated','invoiced') THEN 0 ELSE 1 END,
           updated_at DESC
         LIMIT 1`,
        [projectId, project.clientId],
      );
      if (!rows[0]) return null;
      return getQuoteById(rows[0].id);
    });
  }

  const invoiceIds = await withDb(async (query) => {
    const { rows } = await query<{ id: string }>(
      `SELECT id FROM invoices
       WHERE project_id = $1
          OR ($2::uuid IS NOT NULL AND quote_id = $2)
       ORDER BY created_at ASC`,
      [projectId, quote?.id ?? null],
    );
    return rows.map((r) => r.id);
  });

  const { getInvoiceById } = await import("@/lib/invoices");
  const invoices: Invoice[] = [];
  for (const id of invoiceIds) {
    const inv = await getInvoiceById(id);
    if (inv) invoices.push(inv);
  }

  const readiness = evaluateArchiveReadiness({ project, quote, invoices });
  return { project, quote, invoices, readiness };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildArchiveManifestPdfHtml(input: {
  project: Project;
  quote: Quote | null;
  invoices: Invoice[];
  documents: Array<{ kind: string; fileName: string; sha256: string; s3Key: string }>;
  archivedAt: string;
}): string {
  const rows = input.documents
    .map(
      (d) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(d.kind)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(d.fileName)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:11px">${escapeHtml(d.sha256.slice(0, 16))}…</td></tr>`,
    )
    .join("");

  const invoiceRows = input.invoices
    .map(
      (inv) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(inv.reference)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${inv.total} ${escapeHtml(inv.currency)}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(inv.status)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>Archive ${escapeHtml(input.project.name)}</title></head>
<body style="font-family:system-ui,sans-serif;color:#0f172a;padding:32px;max-width:800px;margin:0 auto">
  <h1 style="margin:0 0 8px;font-size:22px">Manifeste d'archive — SD CREATIV</h1>
  <p style="color:#64748b;margin:0 0 24px">Archivé le ${escapeHtml(new Date(input.archivedAt).toLocaleString("fr-FR"))}</p>
  <h2 style="font-size:16px">Projet</h2>
  <p><strong>${escapeHtml(input.project.name)}</strong><br/>Client : ${escapeHtml(input.project.clientCompany || input.project.clientName)}<br/>Statut : livré</p>
  <h2 style="font-size:16px">Devis</h2>
  <p>${input.quote ? `${escapeHtml(input.quote.reference)} — ${escapeHtml(input.quote.status)} — ${input.quote.subtotal} ${escapeHtml(input.quote.currency)}` : "Aucun"}</p>
  <h2 style="font-size:16px">Factures</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">${invoiceRows || "<tr><td>Aucune</td></tr>"}</table>
  <h2 style="font-size:16px;margin-top:24px">Documents S3</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr><th align="left">Type</th><th align="left">Fichier</th><th align="left">SHA256</th></tr></thead>
    <tbody>${rows || "<tr><td colspan='3'>Aucun document</td></tr>"}</tbody>
  </table>
</body></html>`;
}

export async function getProjectArchiveReadiness(projectId: string): Promise<ProjectDossier> {
  return resolveProjectDossier(projectId);
}

export async function getLatestProjectArchiveBundle(
  projectId: string,
): Promise<ProjectArchiveBundle | null> {
  return withDb(async (query) => {
    const { rows } = await query<BundleRow>(
      `SELECT * FROM project_archive_bundles
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [projectId],
    );
    return rows[0] ? mapBundle(rows[0]) : null;
  });
}

export async function listArchivedProjectBundles(): Promise<
  Array<ProjectArchiveBundle & { projectName: string; clientLabel: string }>
> {
  return withDb(async (query) => {
    const { rows } = await query<
      BundleRow & { project_name: string; client_name: string; client_company: string | null }
    >(
      `SELECT b.*, p.name AS project_name, c.name AS client_name, c.company AS client_company
       FROM project_archive_bundles b
       JOIN projects p ON p.id = b.project_id
       JOIN clients c ON c.id = p.client_id
       ORDER BY b.created_at DESC
       LIMIT 200`,
    );
    return rows.map((row) => ({
      ...mapBundle(row),
      projectName: row.project_name,
      clientLabel: row.client_company || row.client_name,
    }));
  });
}

export async function archiveProjectDossier(input: {
  projectId: string;
  actor: { userId: string | null; name: string; email: string | null };
}): Promise<{
  project: Project;
  bundle: ProjectArchiveBundle;
  readiness: ArchiveReadiness;
}> {
  if (!isS3Configured()) {
    throw new ArchiveWorkflowError("Stockage S3 non configuré — archivage impossible.");
  }

  const dossier = await resolveProjectDossier(input.projectId);
  if (dossier.project.archivedAt) {
    throw new ArchiveWorkflowError("Ce dossier est déjà archivé.");
  }
  if (!dossier.readiness.canArchive) {
    throw new ArchiveWorkflowError(
      `Préconditions non remplies : ${dossier.readiness.blockers.join(" ; ")}`,
    );
  }

  const { project, quote, invoices } = dossier;
  const client = await getClientById(project.clientId);
  const portalClientId = client?.portalClientId ?? project.clientId;

  const documents: Array<{
    kind: string;
    fileName: string;
    sha256: string;
    s3Key: string;
  }> = [];

  if (quote) {
    const quoteDocs = await listBillingDocumentsForQuote(quote.id);
    for (const doc of quoteDocs) {
      documents.push({
        kind: doc.kind,
        fileName: doc.fileName,
        sha256: doc.sha256,
        s3Key: doc.s3Key,
      });
    }
    const signed = await getLatestBillingDocument(quote.id, "signed_quote_pdf");
    if (signed && !documents.some((d) => d.s3Key === signed.s3Key)) {
      documents.push({
        kind: signed.kind,
        fileName: signed.fileName,
        sha256: signed.sha256,
        s3Key: signed.s3Key,
      });
    }
  }

  for (const invoice of invoices) {
    const invDoc = await getLatestInvoiceBillingDocument(invoice.id);
    if (invDoc) {
      documents.push({
        kind: invDoc.kind,
        fileName: invDoc.fileName,
        sha256: invDoc.sha256,
        s3Key: invDoc.s3Key,
      });
    }
  }

  try {
    const projectDocs = await listProjectDocuments(portalClientId, project.id);
    for (const doc of projectDocs.slice(0, 100)) {
      if (doc.category === "archive") continue;
      documents.push({
        kind: doc.category,
        fileName: doc.name,
        sha256: "",
        s3Key: doc.key,
      });
    }
  } catch {
    /* list optionnelle */
  }

  const archivedAt = new Date().toISOString();
  const manifestPayload = {
    version: 1,
    archivedAt,
    project: {
      id: project.id,
      name: project.name,
      clientId: project.clientId,
      clientLabel: project.clientCompany || project.clientName,
      status: project.status,
    },
    quote: quote
      ? {
          id: quote.id,
          reference: quote.reference,
          status: quote.status,
          subtotal: quote.subtotal,
          currency: quote.currency,
        }
      : null,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      reference: inv.reference,
      status: inv.status,
      total: inv.total,
      paidAmount: inv.paidAmount,
      currency: inv.currency,
    })),
    documents,
  };

  const manifestJson = Buffer.from(JSON.stringify(manifestPayload, null, 2), "utf8");
  const sha256 = createHash("sha256").update(manifestJson).digest("hex");
  const manifestKey = buildProjectDocumentKey(
    portalClientId,
    project.id,
    "archive",
    `manifeste-${project.id.slice(0, 8)}.json`,
  );
  await uploadObjectBuffer(manifestKey, manifestJson, "application/json");

  const pdfHtml = buildArchiveManifestPdfHtml({
    project,
    quote,
    invoices,
    documents,
    archivedAt,
  });
  const rendered = await renderHtmlToDocument(pdfHtml);
  const pdfKey = buildProjectDocumentKey(
    portalClientId,
    project.id,
    "archive",
    `manifeste-${project.id.slice(0, 8)}.${rendered.extension}`,
  );
  await uploadObjectBuffer(pdfKey, rendered.buffer, rendered.mimeType);

  const bundle = await withDb(async (query) => {
    await query(
      `UPDATE projects SET archived_at = $2, updated_at = NOW() WHERE id = $1`,
      [project.id, new Date(archivedAt)],
    );

    if (quote) {
      await query(
        `UPDATE quotes SET archived_at = $2, project_id = COALESCE(project_id, $3), updated_at = NOW()
         WHERE id = $1`,
        [quote.id, new Date(archivedAt), project.id],
      );
    }

    if (invoices.length > 0) {
      await query(
        `UPDATE invoices SET archived_at = $2, updated_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [invoices.map((i) => i.id), new Date(archivedAt)],
      );
    }

    const { rows } = await query<BundleRow>(
      `INSERT INTO project_archive_bundles (
        project_id, s3_key_manifest, s3_key_pdf, sha256, metadata, created_by
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
      RETURNING *`,
      [
        project.id,
        manifestKey,
        pdfKey,
        sha256,
        JSON.stringify({
          quoteId: quote?.id ?? null,
          invoiceIds: invoices.map((i) => i.id),
          documentCount: documents.length,
        }),
        input.actor.userId,
      ],
    );
    return mapBundle(rows[0]);
  });

  await logCrmAudit({
    actor: input.actor,
    action: "project.archive",
    entityType: "project",
    entityId: project.id,
    summary: `Dossier archivé — ${project.name}`,
    metadata: {
      quoteId: quote?.id ?? null,
      invoiceIds: invoices.map((i) => i.id),
      bundleId: bundle.id,
      sha256,
    },
  });

  if (quote) {
    await logBillingEvent({
      entityType: "quote",
      entityId: quote.id,
      action: "dossier.archived",
      actor: {
        type: "admin",
        id: input.actor.userId,
        name: input.actor.name,
      },
      fromStatus: quote.status,
      toStatus: quote.status,
      summary: `Dossier projet « ${project.name} » archivé avec le devis ${quote.reference}.`,
      metadata: { projectId: project.id, bundleId: bundle.id },
    });
  }

  const updated = await getProjectById(project.id);
  if (!updated) throw new ArchiveWorkflowError("Projet introuvable après archivage.");

  return {
    project: updated,
    bundle,
    readiness: dossier.readiness,
  };
}

export async function getProjectArchiveDetail(projectId: string): Promise<{
  dossier: ProjectDossier;
  bundle: ProjectArchiveBundle | null;
}> {
  const dossier = await resolveProjectDossier(projectId);
  let bundle = await getLatestProjectArchiveBundle(projectId);
  if (bundle && isS3Configured()) {
    try {
      const manifest = await createPresignedDownloadUrl(bundle.s3KeyManifest);
      const pdf = bundle.s3KeyPdf
        ? await createPresignedDownloadUrl(bundle.s3KeyPdf)
        : null;
      bundle = {
        ...bundle,
        manifestUrl: manifest.downloadUrl,
        pdfUrl: pdf?.downloadUrl ?? null,
      };
    } catch {
      /* ignore presign errors */
    }
  }
  return { dossier, bundle };
}
