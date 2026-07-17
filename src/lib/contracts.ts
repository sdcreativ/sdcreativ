import { z } from "zod";
import type { QueryResultRow } from "pg";
import { withDb } from "@/lib/db";
import type { ContractStatus, AmendmentStatus } from "@/content/contracts-labels";
import { CONTRACT_STATUSES } from "@/content/contracts-labels";

export type Contract = {
  id: string;
  reference: string;
  clientId: string;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  quoteId: string | null;
  title: string;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  amount: number | null;
  reminderDaysBefore: number;
  signedAt: string | null;
  sentAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  signatureProvider: string | null;
  esignExternalId: string | null;
  esignDocumentId: string | null;
  esignSignerEmail: string | null;
  esignSentAt: string | null;
  esignCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContractAmendment = {
  id: string;
  contractId: string;
  title: string;
  description: string | null;
  amountDelta: number;
  effectiveDate: string | null;
  status: AmendmentStatus;
  createdAt: string;
};

type ContractRow = {
  id: string;
  reference: string;
  client_id: string;
  client_name: string | null;
  project_id: string | null;
  project_name: string | null;
  quote_id: string | null;
  title: string;
  status: ContractStatus;
  start_date: Date | null;
  end_date: Date | null;
  amount: number | null;
  reminder_days_before: number;
  signed_at: Date | null;
  sent_at: Date | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  signature_provider: string | null;
  esign_external_id: string | null;
  esign_document_id: string | null;
  esign_signer_email: string | null;
  esign_sent_at: Date | null;
  esign_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type AmendmentRow = {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  amount_delta: number;
  effective_date: Date | null;
  status: AmendmentStatus;
  created_at: Date;
};

const contractSelect = `
  SELECT ct.*, c.name AS client_name, p.name AS project_name
  FROM crm_contracts ct
  LEFT JOIN clients c ON c.id = ct.client_id
  LEFT JOIN projects p ON p.id = ct.project_id
`;

function mapContract(row: ContractRow): Contract {
  return {
    id: row.id,
    reference: row.reference,
    clientId: row.client_id,
    clientName: row.client_name,
    projectId: row.project_id,
    projectName: row.project_name,
    quoteId: row.quote_id,
    title: row.title,
    status: row.status,
    startDate: row.start_date?.toISOString().slice(0, 10) ?? null,
    endDate: row.end_date?.toISOString().slice(0, 10) ?? null,
    amount: row.amount,
    reminderDaysBefore: row.reminder_days_before,
    signedAt: row.signed_at?.toISOString() ?? null,
    sentAt: row.sent_at?.toISOString() ?? null,
    notes: row.notes,
    metadata: row.metadata ?? {},
    signatureProvider: row.signature_provider ?? null,
    esignExternalId: row.esign_external_id ?? null,
    esignDocumentId: row.esign_document_id ?? null,
    esignSignerEmail: row.esign_signer_email ?? null,
    esignSentAt: row.esign_sent_at?.toISOString() ?? null,
    esignCompletedAt: row.esign_completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAmendment(row: AmendmentRow): ContractAmendment {
  return {
    id: row.id,
    contractId: row.contract_id,
    title: row.title,
    description: row.description,
    amountDelta: row.amount_delta,
    effectiveDate: row.effective_date?.toISOString().slice(0, 10) ?? null,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

async function nextReference(
  query: (text: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[]; rowCount: number | null }>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT COUNT(*)::text AS count FROM crm_contracts WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year],
  );
  const seq = String(Number((rows[0] as { count: string })?.count ?? 0) + 1).padStart(4, "0");
  return `CTR-${year}-${seq}`;
}

export const createContractSchema = z.object({
  clientId: z.string().uuid(),
  projectId: z.string().uuid().optional().nullable(),
  quoteId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  amount: z.number().int().min(0).optional().nullable(),
  reminderDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const updateContractSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  projectId: z.string().uuid().optional().nullable(),
  status: z.enum(CONTRACT_STATUSES).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  amount: z.number().int().min(0).optional().nullable(),
  reminderDaysBefore: z.number().int().min(1).max(365).optional(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const createAmendmentSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  amountDelta: z.number().int().optional(),
  effectiveDate: z.string().optional().nullable(),
});

export async function listContracts(filters?: {
  clientId?: string;
  status?: ContractStatus;
}): Promise<Contract[]> {
  return withDb(async (query) => {
    const clauses: string[] = [];
    const params: unknown[] = [];
    if (filters?.clientId) {
      params.push(filters.clientId);
      clauses.push(`ct.client_id = $${params.length}`);
    }
    if (filters?.status) {
      params.push(filters.status);
      clauses.push(`ct.status = $${params.length}`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await query<ContractRow>(
      `${contractSelect} ${where} ORDER BY ct.updated_at DESC`,
      params,
    );
    return rows.map(mapContract);
  });
}

export async function getContractById(id: string): Promise<Contract | null> {
  return withDb(async (query) => {
    const { rows } = await query<ContractRow>(`${contractSelect} WHERE ct.id = $1`, [id]);
    return rows[0] ? mapContract(rows[0]) : null;
  });
}

export async function createContract(
  input: z.infer<typeof createContractSchema>,
): Promise<Contract> {
  return withDb(async (query) => {
    const reference = await nextReference(query);
    const status: ContractStatus = input.projectId ? "linked" : "draft";
    const { rows } = await query<ContractRow>(
      `INSERT INTO crm_contracts (
        reference, client_id, project_id, quote_id, title, status,
        start_date, end_date, amount, reminder_days_before, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        reference,
        input.clientId,
        input.projectId ?? null,
        input.quoteId ?? null,
        input.title,
        status,
        input.startDate ?? null,
        input.endDate ?? null,
        input.amount ?? null,
        input.reminderDaysBefore ?? 30,
        input.notes ?? null,
      ],
    );
    const { rows: full } = await query<ContractRow>(
      `${contractSelect} WHERE ct.id = $1`,
      [rows[0]!.id],
    );
    return mapContract(full[0]!);
  });
}

export async function updateContract(
  id: string,
  input: z.infer<typeof updateContractSchema>,
): Promise<Contract | null> {
  return withDb(async (query) => {
    const sets: string[] = [];
    const params: unknown[] = [];

    if (input.title !== undefined) {
      params.push(input.title);
      sets.push(`title = $${params.length}`);
    }
    if (input.projectId !== undefined) {
      params.push(input.projectId);
      sets.push(`project_id = $${params.length}`);
    }
    if (input.status !== undefined) {
      params.push(input.status);
      sets.push(`status = $${params.length}`);
      if (input.status === "sent") sets.push(`sent_at = NOW()`);
      if (input.status === "signed") sets.push(`signed_at = NOW()`);
      if (input.status === "linked" && input.projectId === undefined) {
        /* project_id set separately */
      }
    }
    if (input.startDate !== undefined) {
      params.push(input.startDate);
      sets.push(`start_date = $${params.length}`);
    }
    if (input.endDate !== undefined) {
      params.push(input.endDate);
      sets.push(`end_date = $${params.length}`);
    }
    if (input.amount !== undefined) {
      params.push(input.amount);
      sets.push(`amount = $${params.length}`);
    }
    if (input.reminderDaysBefore !== undefined) {
      params.push(input.reminderDaysBefore);
      sets.push(`reminder_days_before = $${params.length}`);
    }
    if (input.notes !== undefined) {
      params.push(input.notes);
      sets.push(`notes = $${params.length}`);
    }

    if (sets.length === 0) return getContractById(id);

    params.push(id);
    await query(
      `UPDATE crm_contracts SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
      params,
    );
    return getContractById(id);
  });
}

export async function listContractAmendments(contractId: string): Promise<ContractAmendment[]> {
  return withDb(async (query) => {
    const { rows } = await query<AmendmentRow>(
      `SELECT * FROM crm_contract_amendments WHERE contract_id = $1 ORDER BY created_at DESC`,
      [contractId],
    );
    return rows.map(mapAmendment);
  });
}

export async function createContractAmendment(
  contractId: string,
  input: z.infer<typeof createAmendmentSchema>,
): Promise<ContractAmendment> {
  return withDb(async (query) => {
    const { rows } = await query<AmendmentRow>(
      `INSERT INTO crm_contract_amendments (contract_id, title, description, amount_delta, effective_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        contractId,
        input.title,
        input.description ?? null,
        input.amountDelta ?? 0,
        input.effectiveDate ?? null,
      ],
    );
    return mapAmendment(rows[0]!);
  });
}

export async function listContractsDueForReminder(): Promise<Contract[]> {
  return withDb(async (query) => {
    const { rows } = await query<ContractRow>(
      `${contractSelect}
       WHERE ct.status IN ('signed', 'linked')
         AND ct.end_date IS NOT NULL
         AND ct.end_date >= CURRENT_DATE
         AND ct.end_date <= CURRENT_DATE + (ct.reminder_days_before || ' days')::interval
       ORDER BY ct.end_date ASC`,
    );
    return rows.map(mapContract);
  });
}

export async function deleteContract(id: string): Promise<boolean> {
  return withDb(async (query) => {
    const contract = await getContractById(id);
    if (!contract || !["draft", "cancelled"].includes(contract.status)) return false;
    const { rowCount } = await query(`DELETE FROM crm_contracts WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  });
}
