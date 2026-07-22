import { createCrmNotification } from "@/lib/billing/notifications";
import { isDatabaseConfigured, withDb } from "@/lib/db";
import { getCrmDocPageBySlug } from "@/lib/crm-docs";

export type CrmDocFeedbackKind = "helpful" | "error";

export type CrmDocFeedbackRecord = {
  id: string;
  pageSlug: string;
  pageId: string | null;
  userId: string | null;
  userName: string | null;
  kind: CrmDocFeedbackKind;
  message: string;
  createdAt: string;
};

export async function submitCrmDocFeedback(input: {
  pageSlug: string;
  kind: CrmDocFeedbackKind;
  message?: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}): Promise<CrmDocFeedbackRecord> {
  if (!isDatabaseConfigured()) {
    throw new Error("Base non configurée.");
  }

  const slug = input.pageSlug.trim().toLowerCase();
  if (!slug) throw new Error("Slug requis.");
  if (input.kind !== "helpful" && input.kind !== "error") {
    throw new Error("Type de feedback invalide.");
  }

  const page = await getCrmDocPageBySlug(slug);
  const message =
    input.kind === "error"
      ? (input.message?.trim() || "Erreur signalée sans détail.")
      : (input.message?.trim() || "Fiche jugée utile.");

  const record = await withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      page_slug: string;
      page_id: string | null;
      user_id: string | null;
      user_name: string | null;
      kind: CrmDocFeedbackKind;
      message: string;
      created_at: Date;
    }>(
      `INSERT INTO crm_doc_feedback (
         page_slug, page_id, user_id, user_name, kind, message
       ) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        slug,
        page?.id ?? null,
        input.userId && input.userId !== "legacy" ? input.userId : null,
        input.userName ?? null,
        input.kind,
        message.slice(0, 2000),
      ],
    );
    const row = rows[0]!;
    return {
      id: row.id,
      pageSlug: row.page_slug,
      pageId: row.page_id,
      userId: row.user_id,
      userName: row.user_name,
      kind: row.kind,
      message: row.message,
      createdAt: row.created_at.toISOString(),
    };
  });

  const title =
    input.kind === "helpful"
      ? `Doc utile : ${page?.title ?? slug}`
      : `Erreur doc : ${page?.title ?? slug}`;
  const who = input.userName || input.userEmail || "Un membre";
  const notifMessage =
    input.kind === "helpful"
      ? `${who} a trouvé la fiche « ${page?.title ?? slug} » utile.`
      : `${who} signale une erreur sur « ${page?.title ?? slug} » : ${message}`;

  void createCrmNotification({
    audience: "admin",
    category: "docs",
    eventType: input.kind === "helpful" ? "doc_feedback_helpful" : "doc_feedback_error",
    title,
    message: notifMessage,
    linkHref: page
      ? `/admin/crm/documentation#${encodeURIComponent(page.slug)}`
      : "/admin/crm/documentation",
    entityType: "crm_doc_page",
    entityId: page?.id ?? slug,
    recipientName: input.userName ?? null,
  }).catch((err) => console.error("[crm-docs-feedback] notif", err));

  return record;
}
