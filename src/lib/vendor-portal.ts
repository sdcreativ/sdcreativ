import { createHash, randomBytes } from "node:crypto";
import { withDb } from "@/lib/db";
import type { PurchaseOrderStatus } from "@/content/priority3-labels";
import type { SupportedCurrency } from "@/lib/currencies";
import { normalizeCurrency } from "@/lib/currencies";

const PORTAL_TTL_DAYS = 30;

export type VendorPortalPo = {
  id: string;
  reference: string;
  vendorName: string;
  projectName: string | null;
  amount: number;
  currency: SupportedCurrency;
  status: PurchaseOrderStatus;
  dueDate: string | null;
  description: string | null;
  deliverableNote: string | null;
  deliveredAt: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueVendorPoPortalLink(poId: string): Promise<{
  token: string;
  signUrl: string;
  expiresAt: string;
}> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PORTAL_TTL_DAYS * 86_400_000);

  await withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE vendor_purchase_orders SET
         portal_token_hash = $2,
         portal_token_expires_at = $3,
         status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END
       WHERE id = $1`,
      [poId, tokenHash, expiresAt],
    );
    if (!rowCount) throw new Error("Bon de commande introuvable.");
  });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com").replace(/\/$/, "");
  return {
    token,
    signUrl: `${siteUrl}/espace-prestataire/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getVendorPoByPortalToken(token: string): Promise<VendorPortalPo | null> {
  const tokenHash = hashToken(token);
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      reference: string;
      vendor_name: string;
      project_name: string | null;
      amount: number;
      currency: string;
      status: PurchaseOrderStatus;
      due_date: Date | null;
      description: string | null;
      portal_deliverable_note: string | null;
      portal_delivered_at: Date | null;
    }>(
      `SELECT po.id, po.reference, v.name AS vendor_name, p.name AS project_name,
              po.amount, po.currency, po.status, po.due_date, po.description,
              po.portal_deliverable_note, po.portal_delivered_at
       FROM vendor_purchase_orders po
       JOIN crm_vendors v ON v.id = po.vendor_id
       LEFT JOIN projects p ON p.id = po.project_id
       WHERE po.portal_token_hash = $1
         AND po.portal_token_expires_at IS NOT NULL
         AND po.portal_token_expires_at > NOW()
         AND po.status NOT IN ('cancelled')
       LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      reference: row.reference,
      vendorName: row.vendor_name,
      projectName: row.project_name,
      amount: row.amount,
      currency: normalizeCurrency(row.currency),
      status: row.status,
      dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
      description: row.description,
      deliverableNote: row.portal_deliverable_note,
      deliveredAt: row.portal_delivered_at?.toISOString() ?? null,
    };
  });
}

export async function submitVendorPortalDeliverable(input: {
  token: string;
  note: string;
  markAccepted?: boolean;
}): Promise<VendorPortalPo> {
  const note = input.note.trim();
  if (note.length < 4) throw new Error("Décrivez le livrable (min. 4 caractères).");

  const tokenHash = hashToken(input.token);
  await withDb(async (query) => {
    const { rowCount } = await query(
      `UPDATE vendor_purchase_orders SET
         portal_deliverable_note = $2,
         portal_delivered_at = NOW(),
         status = CASE
           WHEN $3 THEN 'accepted'
           WHEN status IN ('draft', 'sent') THEN 'accepted'
           ELSE status
         END
       WHERE portal_token_hash = $1
         AND portal_token_expires_at > NOW()
         AND status NOT IN ('cancelled', 'paid')`,
      [tokenHash, note.slice(0, 4000), Boolean(input.markAccepted)],
    );
    if (!rowCount) throw new Error("Lien invalide ou BDC non modifiable.");
  });

  const po = await getVendorPoByPortalToken(input.token);
  if (!po) throw new Error("BDC introuvable après dépôt.");
  return po;
}
